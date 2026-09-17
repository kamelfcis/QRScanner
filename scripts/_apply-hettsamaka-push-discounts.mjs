#!/usr/bin/env node
/**
 * Apply migrations 034 + 035 on Hetta Samaka ONLY (selnwhfvqhqbzxcuwaho).
 */
import { readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getHettSamakaSecrets, EXPECTED_REF } from './_get-hettsamaka-secrets.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANAGEMENT_API = 'https://api.supabase.com';
const MIGRATIONS = ['034_push_subscriptions.sql', '035_discount_engine_coupons.sql'];

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

function loadEnv(root) {
  const env = {};
  for (const name of ['.env.local', '.env']) {
    const p = join(root, name);
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
      /* missing */
    }
  }
  return env;
}

async function main() {
  const env = loadEnv(ROOT);
  let token =
    process.env.SUPABASE_ACCESS_TOKEN ||
    process.env.SUPABASE_MANAGEMENT_TOKEN ||
    env.SUPABASE_ACCESS_TOKEN ||
    env.SUPABASE_MANAGEMENT_TOKEN;

  if (!token) {
    const secrets = await getHettSamakaSecrets();
    token = secrets.supabaseAccessToken;
  }
  if (!token) {
    throw new Error('Missing Supabase Management API token');
  }

  for (const migration of MIGRATIONS) {
    const sqlPath = join(ROOT, 'supabase', 'migrations', migration);
    const migrationSql = readFileSync(sqlPath, 'utf8');
    console.log(`Applying ${migration} on ${EXPECTED_REF}…`);
    await runSql(token, migrationSql, migration);
    console.log(`Applied ${migration}`);
  }

  const pushTable = await runSql(
    token,
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'push_subscriptions'
      ORDER BY ordinal_position`,
    'verify push_subscriptions'
  );
  console.log('push_subscriptions columns:', JSON.stringify(pushTable, null, 2));

  const couponCols = await runSql(
    token,
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'coupons'
        AND column_name IN ('requires_code', 'is_stackable', 'bogo_buy', 'bogo_get')
      ORDER BY column_name`,
    'verify coupons columns'
  );
  console.log('coupons discount columns:', JSON.stringify(couponCols, null, 2));

  const functions = await runSql(
    token,
    `SELECT proname
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND proname IN ('resolve_cart_discounts', 'compute_coupon_amount')
      ORDER BY proname`,
    'verify functions'
  );
  console.log('Functions:', JSON.stringify(functions, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
