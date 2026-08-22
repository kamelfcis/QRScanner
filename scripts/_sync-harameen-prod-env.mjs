#!/usr/bin/env node
/** Sync Harameen Supabase + branding env to all Vercel targets; remove empty duplicates. */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_ID = 'prj_nTFxxfwomv65CwKmJCy0xxrlnqS7';
const TARGETS = ['production', 'preview', 'development'];
const HARAMEEN_REF = 'twaiccdmimujrbumwrck';

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

const local = { ...loadEnv('.env'), ...loadEnv('.env.local'), ...loadEnv('.env.harameen.tmp') };
const token = local.VERCEL_TOKEN;
if (!token) {
  console.error('no VERCEL_TOKEN');
  process.exit(1);
}

const serviceRole =
  local.SUPABASE_SERVICE_ROLE_KEY && local.SUPABASE_SERVICE_ROLE_KEY !== '[SENSITIVE]'
    ? local.SUPABASE_SERVICE_ROLE_KEY
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3YWljY2RtaW11anJidW13cmNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQzMTY5MCwiZXhwIjoyMTAyMDA3NjkwfQ.CB-b-6yIXSxe03nQ4xw0xcfmHFShsqrY1xIOgJhOwlQ';

const desired = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', value: `https://${HARAMEEN_REF}.supabase.co`, type: 'plain' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: local.NEXT_PUBLIC_SUPABASE_ANON_KEY, type: 'encrypted' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', value: serviceRole, type: 'encrypted' },
  { key: 'NEXT_PUBLIC_TENANT', value: 'harameen', type: 'plain' },
  { key: 'NEXT_PUBLIC_DEFAULT_LOCALE', value: 'ar', type: 'plain' },
  { key: 'NEXT_PUBLIC_ENABLED_LOCALES', value: 'ar,en', type: 'plain' },
  { key: 'NEXT_PUBLIC_APP_NAME', value: 'Harameen Wholesale Market', type: 'plain' },
  { key: 'NEXT_PUBLIC_APP_NAME_AR', value: 'سوق الجملة شركة الحرمين', type: 'plain' },
];

const listRes = await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env?decrypt=true`, {
  headers: { Authorization: `Bearer ${token}` },
});
const envs = (await listRes.json()).envs ?? [];

async function del(id, key) {
  const res = await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`deleted ${key} ${id}:`, res.ok ? 'ok' : await res.text());
}

async function create(key, value, type) {
  const res = await fetch(`https://api.vercel.com/v10/projects/${PROJECT_ID}/env`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value, type, target: TARGETS }),
  });
  const json = await res.json();
  console.log(`created ${key}:`, res.ok ? 'ok' : json);
}

async function upsert(item) {
  const rows = envs.filter((e) => e.key === item.key);
  const badRows = rows.filter((row) => {
    const empty = !row.value || row.value.trim() === '' || row.value === '[SENSITIVE]';
    const devOnly = (row.target ?? []).length === 1 && (row.target ?? [])[0] === 'development';
    const prodOnly = (row.target ?? []).length === 1 && (row.target ?? [])[0] === 'production';
    return empty || devOnly || (prodOnly && TARGETS.length > 1);
  });

  for (const row of badRows) {
    await del(row.id, item.key);
  }

  const goodRows = rows.filter((row) => !badRows.some((b) => b.id === row.id));
  if (goodRows.length === 0) {
    await create(item.key, item.value, item.type);
    return;
  }

  for (const row of goodRows) {
    const patchRes = await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${row.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: item.value, target: TARGETS, type: item.type }),
    });
    const patchJson = await patchRes.json();
    console.log(`updated ${item.key}:`, patchRes.ok ? 'ok' : patchJson);
  }
}

for (const item of desired) {
  await upsert(item);
}

console.log('Harameen env sync complete.');
