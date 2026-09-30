#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv(root) {
  const env = {};
  for (const name of ['.env.ostol.verify.tmp', '.env.ostol-seafood.pull', '.env.ostol.production']) {
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

const env = loadEnv(ROOT);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const key =
  anon && anon.split('.').length === 3
    ? anon
    : service && service.split('.').length === 3
      ? service
      : null;

if (!url?.includes('mylxcokqjbaazlfdrnts') || !key) {
  console.error('Missing Ostol Supabase credentials in .env.ostol-seafood.pull');
  process.exit(2);
}

const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function checkTable(name) {
  const res = await fetch(`${url}/rest/v1/${name}?select=id&limit=1`, { headers });
  const text = await res.text();
  return { name, status: res.status, ok: res.ok, body: text.slice(0, 200) };
}

async function checkRpc(name, body = {}) {
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { name, status: res.status, ok: res.ok, body: text.slice(0, 200) };
}

const tables = [
  'shifts',
  'stock_items',
  'warehouses',
  'customers_public',
  'product_offers',
  'loyalty_accounts',
];

const results = await Promise.all(tables.map(checkTable));
const rpcs = await Promise.all([
  checkRpc('pos_get_open_shift'),
  checkRpc('assert_shift_open').catch(() => null),
]);

console.log(JSON.stringify({ tables: results, rpcs }, null, 2));

const applied = results.every((r) => r.status === 200);
console.log(applied ? 'MIGRATION_APPLIED' : 'MIGRATION_NOT_APPLIED');
process.exit(applied ? 0 : 1);
