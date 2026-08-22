#!/usr/bin/env node
/** Remove empty duplicate Vercel env rows and set Aklet production values. */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const AKLET_REF = 'hcgiqolzmuxaraaxozmk';

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

const local = {
  ...loadEnvFile('.env'),
  ...loadEnvFile('.env.local'),
  ...loadEnvFile('.env.aklet.dev.tmp'),
};
const token = local.VERCEL_TOKEN;
if (!token) {
  console.error('no VERCEL_TOKEN');
  process.exit(1);
}

const projectId = 'prj_FNonretsEgvpkDj2BgVd35DYW7Aj';
const targets = ['production', 'preview', 'development'];

const creds = {
  url: local.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: local.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceKey: local.SUPABASE_SERVICE_ROLE_KEY,
};
if (!creds.url?.includes(AKLET_REF)) {
  console.error('Missing Aklet creds in .env.aklet.dev.tmp');
  process.exit(1);
}

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

async function create(key, value, type) {
  const res = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value, type, target: targets }),
  });
  const json = await res.json();
  console.log(`created ${key}:`, res.ok ? 'ok' : json);
}

const keysToFix = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_NAME',
];

for (const key of keysToFix) {
  const rows = envs.filter((e) => e.key === key);
  for (const row of rows) {
    const empty = !row.value || row.value.trim() === '';
    const devOnly =
      (row.target ?? []).length === 1 && (row.target ?? [])[0] === 'development';
    if (empty || devOnly) {
      await del(row.id, key);
    }
  }
}

await create('NEXT_PUBLIC_SUPABASE_URL', creds.url, 'plain');
await create('NEXT_PUBLIC_SUPABASE_ANON_KEY', creds.anonKey, 'encrypted');
await create('SUPABASE_SERVICE_ROLE_KEY', creds.serviceKey, 'encrypted');
await create('NEXT_PUBLIC_APP_NAME', 'Aklet Gambary', 'plain');

console.log('Done. Aklet ref:', AKLET_REF);
