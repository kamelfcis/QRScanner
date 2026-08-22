#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function loadEnv(name) {
  const env = {};
  const p = resolve(ROOT, name);
  if (!existsSync(p)) return env;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[t.slice(0, i).trim()] = val;
  }
  return env;
}

const env = { ...loadEnv('.env'), ...loadEnv('.env.local') };
const token = env.VERCEL_TOKEN;
const projectId = 'prj_FNonretsEgvpkDj2BgVd35DYW7Aj';

const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env?decrypt=true`, {
  headers: { Authorization: `Bearer ${token}` },
});
const json = await res.json();
const keys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_NAME',
  'NEXT_PUBLIC_APP_NAME_AR',
];

for (const key of keys) {
  const rows = (json.envs ?? []).filter((e) => e.key === key);
  console.log(`\n${key} (${rows.length} rows)`);
  for (const row of rows) {
    const val = row.value ?? '';
    const preview = val.length > 40 ? `${val.slice(0, 20)}…(${val.length})` : val || '(empty)';
    console.log(`  id=${row.id} type=${row.type} targets=${(row.target ?? []).join(',')} value=${preview}`);
  }
}
