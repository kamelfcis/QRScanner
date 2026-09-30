#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PROJECT = 'mylxcokqjbaazlfdrnts';
const MIGRATION_NAME = 'ostol_pos';
const MIGRATION_FILE = '042_ostol_pos.sql';

function loadEnv() {
  const env = {};
  for (const name of ['.env.local', '.env']) {
    const p = resolve(ROOT, name);
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

const env = loadEnv();
const token =
  process.env.OSTOL_ACCESS_TOKEN ||
  env.OSTOL_ACCESS_TOKEN ||
  process.env.SUPABASE_ACCESS_TOKEN ||
  env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('Missing OSTOL_ACCESS_TOKEN or SUPABASE_ACCESS_TOKEN in env / .env.local');
  process.exit(1);
}

async function mgmtQuery(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return JSON.parse(text);
}

async function verify() {
  return mgmtQuery(`
    SELECT
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shifts') AS has_shifts,
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_items') AS has_stock_items,
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'pos_sales_report') AS has_pos_sales_report,
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'assert_shift_open') AS has_assert_shift_open;
  `);
}

let check;
try {
  check = await verify();
} catch (err) {
  console.error('Verify query failed:', err instanceof Error ? err.message : err);
  process.exit(1);
}

const row = check[0] ?? check;
const alreadyApplied =
  row.has_shifts && row.has_stock_items && row.has_pos_sales_report && row.has_assert_shift_open;

if (alreadyApplied) {
  console.log('Migration already applied (tables/functions present)');
} else {
  const query = readFileSync(resolve(ROOT, 'supabase/migrations', MIGRATION_FILE), 'utf8');
  try {
    await mgmtQuery(query);
    console.log('Applied migration via database/query:', MIGRATION_FILE);
  } catch (err) {
    console.error('Apply failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
  check = await verify();
}

console.log('Verify:', JSON.stringify(check[0] ?? check, null, 2));
