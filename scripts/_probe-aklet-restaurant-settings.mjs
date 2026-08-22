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

async function loadAkletProdCreds(token) {
  const projectId = 'prj_FNonretsEgvpkDj2BgVd35DYW7Aj';
  const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env?decrypt=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  const pick = (key) =>
    (json.envs ?? []).find((e) => e.key === key && (e.target ?? []).includes('production'))?.value;
  return {
    url: pick('NEXT_PUBLIC_SUPABASE_URL'),
    key: pick('SUPABASE_SERVICE_ROLE_KEY') || pick('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  };
}

const local = { ...loadEnv('.env'), ...loadEnv('.env.local'), ...loadEnv('.env.aklet.dev.tmp') };
const token = local.VERCEL_TOKEN;
let url = local.NEXT_PUBLIC_SUPABASE_URL;
let key = local.SUPABASE_SERVICE_ROLE_KEY || local.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (token && (!url?.includes('hcgiqolzmuxaraaxozmk') || !key)) {
  const prodRes = await fetch(
    `https://api.vercel.com/v9/projects/prj_FNonretsEgvpkDj2BgVd35DYW7Aj/env?decrypt=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const prodJson = await prodRes.json();
  const pick = (k) =>
    (prodJson.envs ?? []).find(
      (e) => e.key === k && (e.target ?? []).includes('production') && e.value && !e.value.startsWith('eyJ')
    )?.value;
  url = pick('NEXT_PUBLIC_SUPABASE_URL') || url;
  key = pick('SUPABASE_SERVICE_ROLE_KEY') || pick('NEXT_PUBLIC_SUPABASE_ANON_KEY') || key;
}

const ref = url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? 'unknown';
console.log('Supabase ref:', ref);

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await sb.from('settings').select('key, value').eq('key', 'restaurant').maybeSingle();
if (error) {
  console.error('Query error:', error.message);
  process.exit(1);
}
console.log(JSON.stringify(data?.value ?? null, null, 2));
