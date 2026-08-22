#!/usr/bin/env node
/**
 * Purge all notifications and orders on Ahl El Sham ONLY.
 * Requires explicit --confirm flag.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { createDecipheriv } from 'crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGaz_ROOT = resolve(ROOT, '../engaz-admin-wt');
const CUSTOMER_ID = 'e8438bc2-e5e9-42a2-9eb0-6d48081740d0';
const EXPECTED_REF = 'qfwxghcshhvdozwpmlov';
const MANAGEMENT_API = 'https://api.supabase.com';

const COUNT_SQL = `
SELECT jsonb_build_object(
  'orders', (SELECT count(*)::int FROM public.orders),
  'order_items', (SELECT count(*)::int FROM public.order_items),
  'notifications', (SELECT count(*)::int FROM public.notifications),
  'coupon_redemptions', (SELECT count(*)::int FROM public.coupon_redemptions),
  'order_place_attempts', (SELECT count(*)::int FROM public.order_place_attempts),
  'coupons_redeemed_total', (SELECT coalesce(sum(redeemed_count), 0)::int FROM public.coupons)
) AS counts;
`;

const PURGE_SQL = `
BEGIN;

DELETE FROM public.notifications;

DELETE FROM public.orders;

UPDATE public.coupons SET redeemed_count = 0;

DELETE FROM public.order_place_attempts;

ALTER SEQUENCE public.order_number_seq RESTART WITH 1;

COMMIT;
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
    throw new Error('Unexpected Engaz admin URL host (ref mismatch)');
  }

  const admin = createClient(engazEnv.NEXT_PUBLIC_SUPABASE_URL, engazEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: customer, error: cErr } = await admin
    .from('customers')
    .select('id, slug')
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

  return { customer, secrets };
}

async function runSql(secrets, query, label) {
  if (!secrets.supabaseAccessToken) {
    throw new Error(`No supabaseAccessToken for Management API (${label})`);
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
    throw new Error(`SQL failed (${res.status}) in ${label}: ${body.slice(0, 800)}`);
  }
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

function extractCounts(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0]?.counts ?? null;
}

function assertAllZero(counts, label) {
  const tables = ['orders', 'order_items', 'notifications', 'coupon_redemptions', 'order_place_attempts'];
  const remaining = tables.filter((t) => (counts?.[t] ?? 0) > 0);
  if (remaining.length > 0) {
    throw new Error(`${label}: non-zero counts remain in ${remaining.join(', ')}`);
  }
}

async function main() {
  const confirmed = process.argv.includes('--confirm');
  if (!confirmed) {
    console.error('Refusing to run without --confirm flag.');
    console.error('Usage: node scripts/_purge-ahlalsham-orders-notifications.mjs --confirm');
    process.exit(1);
  }

  const { customer, secrets } = await resolveAhlalsham();
  console.log(`\nPurging orders + notifications on ${EXPECTED_REF} (${customer.slug})...`);

  console.log('Counting before purge...');
  const beforeResult = await runSql(secrets, COUNT_SQL, 'count_before');
  const before = extractCounts(beforeResult);

  await runSql(secrets, PURGE_SQL, 'purge');

  console.log('Counting after purge...');
  const afterResult = await runSql(secrets, COUNT_SQL, 'count_after');
  const after = extractCounts(afterResult);

  const report = {
    customer_id: CUSTOMER_ID,
    project_ref: EXPECTED_REF,
    slug: customer.slug,
    before,
    after,
    purged_at: new Date().toISOString(),
  };

  console.log('\nPurge report:');
  console.log(JSON.stringify(report, null, 2));

  if (!before || !after) {
    throw new Error('Could not parse before/after counts from SQL result');
  }

  assertAllZero(after, 'After purge');

  console.log('\nAhl El Sham purge complete. Dashboard order board and notifications should be empty.');
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
