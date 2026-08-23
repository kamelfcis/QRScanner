#!/usr/bin/env node
/**
 * Apply delivery-fee migration 024 on Ahl El Sham ONLY.
 * Does not change RLS. Staff UPDATE on orders already exists.
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

const MIGRATION_FILES = ['024_order_delivery_fee.sql'];

const VERIFY_SQL = `
SELECT jsonb_build_object(
  'project_ref_ok', current_database() IS NOT NULL,
  'delivery_fee_col', EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_fee'
  ),
  'money_check', (
    SELECT pg_get_constraintdef(oid)
    FROM pg_constraint
    WHERE conname = 'orders_money_check'
      AND conrelid = 'public.orders'::regclass
  ),
  'place_fn', EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'place_customer_order'
  ),
  'protect_fn', EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'protect_order_immutable_fields'
  )
) AS status;
`;

const VERIFY_FN_SQL = `
SELECT jsonb_build_object(
  'place_sets_zero',
    pg_get_functiondef('public.place_customer_order(jsonb)'::regprocedure)
    LIKE '%delivery_fee, total%',
  'protect_recomputes',
    pg_get_functiondef('public.protect_order_immutable_fields()'::regprocedure)
    LIKE '%NEW.delivery_fee%'
) AS status;
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

  return { secrets };
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
    throw new Error(`SQL failed (${res.status}) in ${fileName}: ${body.slice(0, 800)}`);
  }
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

function unwrapStatus(result) {
  const row = Array.isArray(result) ? result[0] : result;
  return row?.status ?? row;
}

async function main() {
  const { secrets } = await resolveAhlalsham();

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

  console.log('\nAfter:');
  const after = await runSql(secrets, VERIFY_SQL, 'verify_after');
  console.log(JSON.stringify(after, null, 2));
  const fns = await runSql(secrets, VERIFY_FN_SQL, 'verify_fns');
  console.log('Functions:', JSON.stringify(fns, null, 2));

  const status = unwrapStatus(after);
  if (status?.delivery_fee_col !== true) {
    throw new Error('orders.delivery_fee missing after migration');
  }
  if (!String(status?.money_check ?? '').includes('delivery_fee')) {
    throw new Error(`orders_money_check missing delivery_fee: ${status?.money_check}`);
  }
  const fnStatus = unwrapStatus(fns);
  if (fnStatus?.place_sets_zero !== true || fnStatus?.protect_recomputes !== true) {
    throw new Error(`functions not updated: ${JSON.stringify(fnStatus)}`);
  }

  console.log('\nAhl El Sham delivery fee migration complete.');
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
