#!/usr/bin/env node
/**
 * Apply coupons migration 022 on Ahl El Sham ONLY.
 * Enable settings.features.coupons (preserve other feature keys).
 * Sync Engaz customers.features.coupons = true for this customer.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { createDecipheriv } from 'crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGaz_ROOT = resolve(ROOT, '../engaz-admin-wt');
const CUSTOMER_ID = 'e8438bc2-e5e9-42a2-9eb0-6d48081740d0';
const EXPECTED_REF = 'qfwxghcshhvdozwpmlov';
const MANAGEMENT_API = 'https://api.supabase.com';

const MIGRATION_FILES = ['022_coupons.sql'];

const ENABLE_COUPONS_SQL = `
INSERT INTO public.settings (key, value)
VALUES (
  'features',
  '{"coupons": true}'::jsonb
)
ON CONFLICT (key) DO UPDATE
SET value = public.settings.value || '{"coupons": true}'::jsonb,
    updated_at = now();
`;

const SAMPLE_COUPONS_SQL = `
INSERT INTO public.coupons (
  code, discount_type, discount_value, min_subtotal, is_active, per_phone_limit
)
VALUES
  ('WELCOME10', 'percentage', 10, 0, true, 1),
  ('SAVE20', 'fixed', 20, 0, true, 1)
ON CONFLICT (code) DO NOTHING;
`;

const VERIFY_SQL = `
SELECT jsonb_build_object(
  'coupons_table', EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'coupons'
  ),
  'redemptions_table', EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'coupon_redemptions'
  ),
  'orders_discount', EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'discount_amount'
  ),
  'preview_fn', EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'preview_customer_coupon'
  ),
  'place_fn', EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'place_customer_order'
  ),
  'features', (SELECT value FROM public.settings WHERE key = 'features')
) AS status;
`;

const VERIFY_SAMPLES_SQL = `
SELECT coalesce(array_agg(code ORDER BY code), '{}') AS sample_codes
FROM public.coupons
WHERE code IN ('WELCOME10', 'SAVE20');
`;

const VERIFY_PREVIEW_SQL = `
WITH p AS (
  SELECT id FROM public.products WHERE is_available IS TRUE LIMIT 1
)
SELECT
  public.preview_customer_coupon(
    jsonb_build_object(
      'dining_mode', 'dining',
      'coupon_code', 'WELCOME10',
      'items', jsonb_build_array(jsonb_build_object('product_id', p.id, 'quantity', 2))
    )
  ) AS welcome10,
  public.preview_customer_coupon(
    jsonb_build_object(
      'dining_mode', 'dining',
      'coupon_code', 'NOTREAL',
      'items', jsonb_build_array(jsonb_build_object('product_id', p.id, 'quantity', 2))
    )
  ) AS invalid
FROM p;
`;

function loadEnvFile(name, root) {
  const env = {};
  const p = resolve(root, name);
  if (!existsSync(p)) return env;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[t.slice(0, i).trim()] = val;
  }
  return env;
}

function decryptJson({ ciphertext, iv, authTag }, keyB64) {
  const key = Buffer.from(keyB64, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]);
  return JSON.parse(plain.toString('utf8'));
}

function mask(value) {
  if (!value) return '(missing)';
  const s = String(value);
  if (s.length <= 8) return `${s.slice(0, 2)}…`;
  return `${s.slice(0, 4)}…${s.slice(-4)} (len=${s.length})`;
}

async function resolveAhlalsham() {
  const engazEnv = { ...loadEnvFile('.env', ENGaz_ROOT), ...loadEnvFile('.env.local', ENGaz_ROOT) };
  if (!engazEnv.NEXT_PUBLIC_SUPABASE_URL || !engazEnv.SUPABASE_SERVICE_ROLE_KEY || !engazEnv.ENGAZ_SECRETS_KEY) {
    throw new Error('Missing Engaz admin env vars');
  }
  const adminUrl = engazEnv.NEXT_PUBLIC_SUPABASE_URL;
  if (!adminUrl.includes('zvngjznpvibciituiced')) {
    throw new Error(`Unexpected Engaz admin URL host (ref mismatch)`);
  }

  const admin = createClient(engazEnv.NEXT_PUBLIC_SUPABASE_URL, engazEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: customer, error: cErr } = await admin
    .from('customers')
    .select('id, slug, features')
    .eq('id', CUSTOMER_ID)
    .maybeSingle();
  if (cErr) throw new Error(`Customer fetch: ${cErr.message}`);
  if (!customer) throw new Error('Ahl El Sham customer not found');

  const { data: sec, error: secErr } = await admin
    .from('customer_secrets')
    .select('ciphertext, iv, auth_tag')
    .eq('customer_id', customer.id)
    .maybeSingle();
  if (secErr) throw new Error(`Secrets fetch: ${secErr.message}`);
  if (!sec) throw new Error('Ahl El Sham secrets not found');

  const secrets = decryptJson({ ...sec, authTag: sec.auth_tag }, engazEnv.ENGAZ_SECRETS_KEY);
  if (secrets.supabaseProjectRef !== EXPECTED_REF) {
    throw new Error(`Unexpected project ref: ${secrets.supabaseProjectRef}`);
  }
  if (!secrets.supabaseAccessToken && !secrets.supabaseServiceRoleKey) {
    throw new Error('No access token or service role in customer secrets');
  }

  console.log('Customer slug:', customer.slug);
  console.log('Customer id:', customer.id);
  console.log('Supabase ref:', secrets.supabaseProjectRef);
  console.log('Access token:', mask(secrets.supabaseAccessToken));
  console.log('Service role:', mask(secrets.supabaseServiceRoleKey));
  console.log('Existing Engaz features:', JSON.stringify(customer.features ?? {}));

  return { admin, customer, secrets };
}

function isAlreadyExistsError(message) {
  const text = message.toLowerCase();
  return (
    text.includes('already exists') ||
    text.includes('42701') ||
    text.includes('duplicate') ||
    text.includes('42p07')
  );
}

async function runSql(secrets, query, fileName) {
  if (!secrets.supabaseAccessToken) {
    throw new Error(`No supabaseAccessToken for Management API (${fileName})`);
  }
  const res = await fetch(
    `${MANAGEMENT_API}/v1/projects/${secrets.supabaseProjectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secrets.supabaseAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );
  const body = await res.text();
  if (!res.ok) {
    if (isAlreadyExistsError(body)) {
      console.log(`  skip ${fileName} (already applied)`);
      return null;
    }
    throw new Error(`SQL failed (${res.status}) in ${fileName}: ${body.slice(0, 1200)}`);
  }
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

async function main() {
  const { admin, customer, secrets } = await resolveAhlalsham();

  console.log('\nBefore:');
  const before = await runSql(secrets, VERIFY_SQL, 'verify_before');
  console.log(JSON.stringify(before, null, 2));

  console.log(`\nApplying migrations to ${EXPECTED_REF}...`);
  for (const file of MIGRATION_FILES) {
    const sql = readFileSync(join(ROOT, 'supabase/migrations', file), 'utf8');
    console.log(`  applying ${file}...`);
    await runSql(secrets, sql, file);
    console.log(`  ok ${file}`);
  }

  console.log('  enabling coupons (preserving existing features)...');
  await runSql(secrets, ENABLE_COUPONS_SQL, 'enable_coupons');

  console.log('  seeding sample coupons WELCOME10 / SAVE20 (if missing)...');
  await runSql(secrets, SAMPLE_COUPONS_SQL, 'sample_coupons');

  const nextFeatures = {
    ...(customer.features && typeof customer.features === 'object' ? customer.features : {}),
    coupons: true,
  };
  const { error: updErr } = await admin
    .from('customers')
    .update({ features: nextFeatures })
    .eq('id', CUSTOMER_ID);
  if (updErr) throw new Error(`Engaz features update: ${updErr.message}`);
  console.log('  Engaz customers.features synced:', JSON.stringify(nextFeatures));

  console.log('\nAfter:');
  const after = await runSql(secrets, VERIFY_SQL, 'verify_after');
  console.log(JSON.stringify(after, null, 2));
  const samples = await runSql(secrets, VERIFY_SAMPLES_SQL, 'verify_samples');
  console.log('Sample coupons:', JSON.stringify(samples));
  const preview = await runSql(secrets, VERIFY_PREVIEW_SQL, 'verify_preview');
  console.log('Preview RPC:', JSON.stringify(preview, null, 2));

  const { data: synced, error: syncErr } = await admin
    .from('customers')
    .select('id, slug, features')
    .eq('id', CUSTOMER_ID)
    .single();
  if (syncErr) throw syncErr;
  console.log('Engaz customer features:', JSON.stringify(synced.features));

  const status = Array.isArray(after) ? after[0]?.status ?? after[0] : after;
  const features = status?.features ?? status?.status?.features;
  if (features && features.coupons !== true) {
    throw new Error(`coupons not true after enable: ${JSON.stringify(features)}`);
  }
  if (status && status.coupons_table === false) {
    throw new Error('coupons table missing after migration');
  }
  console.log('\nAhl El Sham coupons migration + flag complete.');
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
