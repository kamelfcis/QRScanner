#!/usr/bin/env node
/** Remove empty duplicate Vercel env rows and extend Supabase keys to all targets. */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(name) {
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

const local = { ...loadEnvFile('.env'), ...loadEnvFile('.env.local') };
const token = local.VERCEL_TOKEN;
if (!token) {
  console.error('no VERCEL_TOKEN');
  process.exit(1);
}

const projectId = 'prj_nTFxxfwomv65CwKmJCy0xxrlnqS7';
const targets = ['production', 'preview', 'development'];

const listRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env?decrypt=true`, {
  headers: { Authorization: `Bearer ${token}` },
});
const envs = (await listRes.json()).envs ?? [];

async function del(id, key) {
  const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`deleted ${key} ${id}:`, res.ok ? 'ok' : await res.text());
}

async function patchTargets(id, key) {
  const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ target: targets }),
  });
  console.log(`patched targets ${key} ${id}:`, res.ok ? targets.join(',') : await res.text());
}

const supabaseKeys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SITE_URL',
];

for (const key of supabaseKeys) {
  const rows = envs.filter((e) => e.key === key);
  for (const row of rows) {
    const empty = !row.value || row.value.trim() === '';
    if (empty) {
      await del(row.id, key);
      continue;
    }
    const rowTargets = row.target ?? [];
    const missing = targets.some((t) => !rowTargets.includes(t));
    if (missing) {
      await patchTargets(row.id, key);
    } else {
      console.log(`${key} ${row.id}: already on all targets`);
    }
  }
}

console.log('Done harameen supabase env cleanup');
