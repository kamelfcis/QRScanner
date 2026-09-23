#!/usr/bin/env node
/**
 * Apply migration 040_daily_ops_refund_transfer.sql on Ala Keefak ONLY (pytmkruoyyhxfktnkpuu).
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_REF = 'pytmkruoyyhxfktnkpuu';
const MANAGEMENT_API = 'https://api.supabase.com';
const MIGRATION_FILE = '040_daily_ops_refund_transfer.sql';

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

  const refundVerify = await runSql(
    token,
    `SELECT pg_get_functiondef(p.oid) AS def
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'refund_order_payment'`,
    'verify refund'
  );
  const voidVerify = await runSql(
    token,
    `SELECT pg_get_functiondef(p.oid) AS def
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'void_order'`,
    'verify void'
  );
  const refundDef = refundVerify?.[0]?.def ?? '';
  const voidDef = voidVerify?.[0]?.def ?? '';
  if (!refundDef.includes('refunded_at')) {
    throw new Error('refund_order_payment missing refunded_at update');
  }
  if (!voidDef.includes('already_paid')) {
    throw new Error('void_order hardening missing already_paid guard');
  }
  console.log('Verification: refund_order_payment and void guard present');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
