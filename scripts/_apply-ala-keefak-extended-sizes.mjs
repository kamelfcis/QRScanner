#!/usr/bin/env node
/**
 * Apply migration 041_product_extended_sizes.sql on Ala Keefak ONLY (pytmkruoyyhxfktnkpuu).
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_REF = 'pytmkruoyyhxfktnkpuu';
const MANAGEMENT_API = 'https://api.supabase.com';
const MIGRATION_FILE = '041_product_extended_sizes.sql';

function loadEnv(root) {
  const env = {};
  for (const name of ['.env.local', '.env']) {
    const p = resolve(root, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
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
  }
  return env;
}

async function runSql(token, query, label) {
  const res = await fetch(`${MANAGEMENT_API}/v1/projects/${EXPECTED_REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`${label} failed (${res.status}): ${body.slice(0, 800)}`);
  }
  return body ? JSON.parse(body) : null;
}

async function main() {
  const env = loadEnv(ROOT);
  const token = env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_MANAGEMENT_TOKEN;
  if (!token) {
    throw new Error('Missing SUPABASE_ACCESS_TOKEN in .env.local');
  }

  const sqlPath = join(ROOT, 'supabase', 'migrations', MIGRATION_FILE);
  const migrationSql = readFileSync(sqlPath, 'utf8');

  console.log(`Applying ${MIGRATION_FILE} on ${EXPECTED_REF}…`);
  await runSql(token, migrationSql, MIGRATION_FILE);

  const verify = await runSql(
    token,
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'products'
       AND column_name IN (
         'price_medium', 'price_family',
         'size_small_enabled', 'size_medium_enabled',
         'size_large_enabled', 'size_family_enabled'
       )
     ORDER BY column_name`,
    'verify-columns'
  );
  console.log('Columns:', JSON.stringify(verify, null, 2));

  const fn = await runSql(
    token,
    `SELECT proname
     FROM pg_proc
     JOIN pg_namespace n ON n.oid = pg_proc.pronamespace
     WHERE n.nspname = 'public'
       AND proname = 'resolve_product_size_unit_price'`,
    'verify-fn'
  );
  console.log('Function:', JSON.stringify(fn, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
