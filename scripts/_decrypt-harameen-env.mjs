#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGaz_ROOT = resolve(ROOT, '../engaz-admin-wt');

function loadEnvFile(name, root = ROOT) {
  const env = {};
  const p = resolve(root, name);
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

const env = loadEnvFile('.env.local');
const token = env.VERCEL_TOKEN;
const projectId = 'prj_nTFxxfwomv65CwKmJCy0xxrlnqS7';

const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env?decrypt=true`, {
  headers: { Authorization: `Bearer ${token}` },
});
const json = await res.json();
for (const row of json.envs ?? []) {
  console.log(`${row.key}: ${row.value ?? '(empty)'}`);
}

const engazEnv = { ...loadEnvFile('.env.local', ENGaz_ROOT), ...loadEnvFile('.env', ENGaz_ROOT) };
if (engazEnv.NEXT_PUBLIC_SUPABASE_URL) {
  const admin = createClient(engazEnv.NEXT_PUBLIC_SUPABASE_URL, engazEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.from('customers').select('id, slug, name, supabase_project_ref').or('slug.eq.harameen,slug.ilike.%harameen%');
  console.log('\nEngaz customers:', error?.message ?? JSON.stringify(data, null, 2));
}
