#!/usr/bin/env node
/**
 * Apply migration 025_delivery_locations.sql on Hetta Samaka ONLY (selnwhfvqhqbzxcuwaho).
 * Requires SUPABASE_ACCESS_TOKEN in .env.local (Management API).
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_REF = 'selnwhfvqhqbzxcuwaho';
const MANAGEMENT_API = 'https://api.supabase.com';
const MIGRATION_FILE = '025_delivery_locations.sql';

const VERIFY_SQL = `
SELECT jsonb_build_object(
  'delivery_locations_table', EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'delivery_locations'
  ),
  'delivery_location_id_col', EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_location_id'
  ),
  'place_fn_resolves_fee', pg_get_functiondef('public.place_customer_order(jsonb)'::regprocedure)
    LIKE '%v_delivery_fee%'
) AS status;
`;

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

function isAlreadyExistsError(message) {
  const text = message.toLowerCase();
  return (
    text.includes('already exists') ||
    text.includes('42701') ||
    text.includes('duplicate') ||
    text.includes('42p07')
  );
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
    if (isAlreadyExistsError(body)) {
      console.log(`SKIP (already applied): ${label}`);
      return { skipped: true };
    }
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

  const verify = await runSql(token, VERIFY_SQL, 'verify');
  console.log('Verification:', JSON.stringify(verify, null, 2));
  console.log('Migration applied successfully.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
