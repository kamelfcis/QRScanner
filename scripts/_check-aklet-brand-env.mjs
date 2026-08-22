#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

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
if (!token) {
  console.error('no VERCEL_TOKEN');
  process.exit(1);
}

const projectId = 'prj_FNonretsEgvpkDj2BgVd35DYW7Aj';
const keys = [
  'NEXT_PUBLIC_APP_NAME',
  'NEXT_PUBLIC_APP_NAME_AR',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_TENANT',
  'NEXT_PUBLIC_DEFAULT_LOCALE',
  'NEXT_PUBLIC_ENABLED_LOCALES',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env?decrypt=true`, {
  headers: { Authorization: `Bearer ${token}` },
});
const json = await res.json();

const vercel = {};
for (const key of keys) {
  for (const target of ['production', 'preview', 'development']) {
    const rows = (json.envs ?? []).filter(
      (e) => e.key === key && (e.target ?? []).includes(target)
    );
    if (rows.length) {
      const val = rows.map((r) => r.value).join(' | ');
      vercel[`${key}[${target}]`] = val.length > 60 ? val.slice(0, 30) + '…' + val.slice(-10) : val;
    } else {
      vercel[`${key}[${target}]`] = 'MISSING';
    }
  }
}
console.log('=== Vercel env ===');
console.log(JSON.stringify(vercel, null, 2));

const prodUrl = (json.envs ?? []).find(
  (e) => e.key === 'NEXT_PUBLIC_SUPABASE_URL' && (e.target ?? []).includes('production')
)?.value;
const prodAnon = (json.envs ?? []).find(
  (e) => e.key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' && (e.target ?? []).includes('production')
)?.value;
const serviceKey = (json.envs ?? []).find(
  (e) => e.key === 'SUPABASE_SERVICE_ROLE_KEY' && (e.target ?? []).includes('production')
)?.value;

if (prodUrl && serviceKey) {
  const sb = createClient(prodUrl, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await sb.from('settings').select('key, value').eq('key', 'restaurant').maybeSingle();
  console.log('\n=== Supabase restaurant settings ===');
  if (error) console.log('error:', error.message);
  else console.log(JSON.stringify(data?.value ?? null, null, 2));
}
