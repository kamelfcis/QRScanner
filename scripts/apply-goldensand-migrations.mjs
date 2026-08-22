#!/usr/bin/env node
/**
 * Apply migration 019 on Golden Sand via Supabase Management API.
 * Enables features.dashboard_orders for this restaurant only.
 * Usage: node scripts/apply-goldensand-migrations.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { createDecipheriv } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ENGaz_ROOT = resolve(__dirname, '../../engaz-admin-wt');
const EXPECTED_REF = 'worxtjqwmlusmttekawu';
const MANAGEMENT_API = 'https://api.supabase.com';

const MIGRATION_FILES = [
  '019_orders.sql',
  '020_order_staff_acknowledged.sql',
  '021_orders_delete.sql',
];

const ENABLE_DASHBOARD_ORDERS_SQL = `
INSERT INTO public.settings (key, value)
VALUES (
  'features',
  '{"ai_product_images": true, "dashboard_orders": true, "order_prefix": "GS"}'::jsonb
)
ON CONFLICT (key) DO UPDATE
SET value = public.settings.value || '{"dashboard_orders": true, "order_prefix": "GS"}'::jsonb,
    updated_at = now();
`;

function loadEnv(root) {
  const env = {};
  for (const name of ['.env.local', '.env']) {
    const p = resolve(root, name);
    try {
      const text = readFileSync(p, 'utf8');
      for (const line of text.split(/\r?\n/)) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const i = t.indexOf('=');
        if (i < 0) continue;
        let val = t.slice(i + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        env[t.slice(0, i).trim()] = val;
      }
    } catch {
      /* missing file */
    }
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

async function getGoldenSandSecrets() {
  const env = loadEnv(ENGaz_ROOT);
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.ENGAZ_SECRETS_KEY) {
    throw new Error('Missing Engaz admin env vars');
  }

  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: doc, error: docErr } = await db
    .from('customers')
    .select('id, slug')
    .eq('slug', 'goldensand')
    .maybeSingle();
  if (docErr) throw new Error(`Customer fetch: ${docErr.message}`);
  if (!doc) throw new Error('Golden Sand customer not found');

  const { data: sec, error: secErr } = await db
    .from('customer_secrets')
    .select('ciphertext, iv, auth_tag')
    .eq('customer_id', doc.id)
    .maybeSingle();
  if (secErr) throw new Error(`Secrets fetch: ${secErr.message}`);
  if (!sec) throw new Error('Golden Sand secrets not found');

  const secrets = decryptJson({ ...sec, authTag: sec.auth_tag }, env.ENGAZ_SECRETS_KEY);
  if (secrets.supabaseProjectRef !== EXPECTED_REF) {
    throw new Error(`Unexpected project ref: ${secrets.supabaseProjectRef}`);
  }
  return secrets;
}

function isAlreadyExistsError(message) {
  const text = message.toLowerCase();
  return text.includes('already exists') || text.includes('42701');
}

async function runSql(secrets, query, fileName) {
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
  if (!res.ok) {
    const body = await res.text();
    const msg = `SQL failed (${res.status}) in ${fileName}: ${body.slice(0, 800)}`;
    if (isAlreadyExistsError(body)) {
      console.log(`  skip ${fileName} (already applied)`);
      return;
    }
    throw new Error(msg);
  }
}

async function main() {
  const secrets = await getGoldenSandSecrets();
  console.log(`Applying migrations to ${EXPECTED_REF}...\n`);

  for (const file of MIGRATION_FILES) {
    const sql = readFileSync(join(ROOT, 'supabase/migrations', file), 'utf8');
    console.log(`  applying ${file}...`);
    await runSql(secrets, sql, file);
    console.log(`  ok ${file}`);
  }

  console.log('  enabling dashboard_orders...');
  await runSql(secrets, ENABLE_DASHBOARD_ORDERS_SQL, 'enable_dashboard_orders');
  console.log('  ok dashboard_orders=true order_prefix=GS');

  console.log('\nMigrations applied.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
