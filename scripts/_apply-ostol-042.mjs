#!/usr/bin/env node
/**
 * Apply migration 042_ostol_pos.sql on Ostol Seafood ONLY (mylxcokqjbaazlfdrnts).
 * Tries Management API migrations endpoint, then database/query fallback.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_REF = 'mylxcokqjbaazlfdrnts';
const MANAGEMENT_API = 'https://api.supabase.com';
const MIGRATION_FILE = '042_ostol_pos.sql';
const MIGRATION_NAME = 'ostol_pos';

function loadEnv(root) {
  const env = {};
  for (const name of ['.env.local', '.env.ostol-seafood.pull', '.env.ostol.production']) {
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
      if (!env[t.slice(0, i).trim()]) {
        env[t.slice(0, i).trim()] = val;
      }
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
    throw new Error(`${label} failed (${res.status}): ${body.slice(0, 1200)}`);
  }
  return body ? JSON.parse(body) : null;
}

async function applyViaMigrationsApi(token, name, query) {
  const res = await fetch(`${MANAGEMENT_API}/v1/projects/${EXPECTED_REF}/database/migrations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, query }),
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`migrations API failed (${res.status}): ${body.slice(0, 1200)}`);
  }
  return body ? JSON.parse(body) : null;
}

async function main() {
  const env = loadEnv(ROOT);
  const token = env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_MANAGEMENT_TOKEN || env.OSTOL_ACCESS_TOKEN;
  if (!token) {
    throw new Error('Missing SUPABASE_ACCESS_TOKEN (must have access to mylxcokqjbaazlfdrnts)');
  }

  const sqlPath = join(ROOT, 'supabase', 'migrations', MIGRATION_FILE);
  const migrationSql = readFileSync(sqlPath, 'utf8');

  console.log(`Applying ${MIGRATION_FILE} on ${EXPECTED_REF} (${migrationSql.length} bytes)…`);

  try {
    await applyViaMigrationsApi(token, MIGRATION_NAME, migrationSql);
    console.log('Applied via migrations API');
  } catch (migrationErr) {
    console.warn('Migrations API:', migrationErr.message);
    console.log('Trying database/query fallback…');
    await runSql(token, migrationSql, MIGRATION_FILE);
    console.log('Applied via database/query');
  }

  const verify = await runSql(
    token,
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN ('shifts','stock_items','warehouses','customers_public','product_offers','loyalty_accounts')
     ORDER BY table_name`,
    'verify'
  );
  console.log('Verification:', JSON.stringify(verify, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
