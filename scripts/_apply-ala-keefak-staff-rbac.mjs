#!/usr/bin/env node
/**
 * Apply migration 042_staff_rbac.sql on Ala Keefak ONLY (pytmkruoyyhxfktnkpuu).
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_REF = 'pytmkruoyyhxfktnkpuu';
const MANAGEMENT_API = 'https://api.supabase.com';
const MIGRATION_FILE = '042_staff_rbac.sql';

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

  const url = env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (url && !url.includes(EXPECTED_REF)) {
    throw new Error(`Refusing to apply: URL does not match ${EXPECTED_REF}`);
  }

  const sqlPath = join(ROOT, 'supabase', 'migrations', MIGRATION_FILE);
  const migrationSql = readFileSync(sqlPath, 'utf8');

  console.log(`Applying ${MIGRATION_FILE} on ${EXPECTED_REF}…`);
  await runSql(token, migrationSql, MIGRATION_FILE);

  const cols = await runSql(
    token,
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'staff_profiles'
       AND column_name IN ('full_name', 'permissions', 'is_active', 'role')
     ORDER BY column_name`,
    'verify-columns'
  );
  console.log('Columns:', JSON.stringify(cols));

  const fn = await runSql(
    token,
    `SELECT proname
     FROM pg_proc
     JOIN pg_namespace n ON n.oid = pg_proc.pronamespace
     WHERE n.nspname = 'public'
       AND proname IN ('staff_can', 'is_staff_admin')
     ORDER BY proname`,
    'verify-fn'
  );
  console.log('Functions:', JSON.stringify(fn));

  const owners = await runSql(
    token,
    `SELECT u.email, sp.role, sp.is_active
       FROM public.staff_profiles sp
       JOIN auth.users u ON u.id = sp.user_id
      WHERE sp.role = 'admin'
      ORDER BY u.email`,
    'verify-admins'
  );
  console.log('Admins:', JSON.stringify(owners));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
