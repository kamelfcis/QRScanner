#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

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

const local = loadEnvFile('.env.local');
const token = local.VERCEL_TOKEN;
const projectId = 'prj_nTFxxfwomv65CwKmJCy0xxrlnqS7';
const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env?decrypt=true`, {
  headers: { Authorization: `Bearer ${token}` },
});
const json = await res.json();
const envMap = Object.fromEntries((json.envs ?? []).map((row) => [row.key, row.value]));
const sb = createClient(envMap.NEXT_PUBLIC_SUPABASE_URL, envMap.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: allSettings, error: allErr } = await sb.from('settings').select('key, value');
console.log('settings error:', allErr?.message ?? 'none');
console.log('settings rows:', allSettings?.map((r) => r.key));

const restaurant = allSettings?.find((r) => r.key === 'restaurant');
console.log('\nrestaurant value:', JSON.stringify(restaurant?.value, null, 2));

const { data: gallery, error: galErr } = await sb.from('gallery').select('*').limit(5);
console.log('\ngallery error:', galErr?.message ?? 'none');
console.log('gallery count:', gallery?.length ?? 0);

const { data: buckets, error: bucketErr } = await sb.storage.listBuckets();
console.log('\nbuckets error:', bucketErr?.message ?? 'none');
console.log('buckets:', buckets?.map((b) => b.name));

for (const b of buckets ?? []) {
  const { data: files, error: listErr } = await sb.storage.from(b.name).list('', { limit: 100 });
  console.log(`\n${b.name} list error:`, listErr?.message ?? 'none');
  console.log(`${b.name} files:`, files?.map((f) => `${f.name}${f.id ? '' : ' (folder)'}`));
}
