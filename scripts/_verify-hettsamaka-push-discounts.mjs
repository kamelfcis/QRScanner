#!/usr/bin/env node
import { getHettSamakaSecrets, EXPECTED_REF } from './_get-hettsamaka-secrets.mjs';

const MANAGEMENT_API = 'https://api.supabase.com';

async function runSql(token, query) {
  const res = await fetch(`${MANAGEMENT_API}/v1/projects/${EXPECTED_REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${body.slice(0, 500)}`);
  return body ? JSON.parse(body) : null;
}

async function main() {
  const secrets = await getHettSamakaSecrets();
  const token = secrets.supabaseAccessToken;

  const tables = await runSql(
    token,
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('push_subscriptions', 'coupons')
      ORDER BY table_name`
  );
  console.log('tables', JSON.stringify(tables, null, 2));

  const pushCols = await runSql(
    token,
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'push_subscriptions'
      ORDER BY ordinal_position`
  );
  console.log('push_subscriptions cols', JSON.stringify(pushCols, null, 2));

  const couponCols = await runSql(
    token,
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'coupons'
        AND column_name IN ('requires_code', 'is_stackable', 'bogo_buy', 'bogo_get')
      ORDER BY column_name`
  );
  console.log('coupon discount cols', JSON.stringify(couponCols, null, 2));

  const fns = await runSql(
    token,
    `SELECT proname FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND proname IN ('resolve_cart_discounts', 'compute_coupon_amount')
     ORDER BY proname`
  );
  console.log('functions', JSON.stringify(fns, null, 2));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
