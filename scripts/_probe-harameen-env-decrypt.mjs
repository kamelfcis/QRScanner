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
const projectId = 'prj_nTFxxfwomv65CwKmJCy0xxrlnqS7';

const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env?decrypt=true`, {
  headers: { Authorization: `Bearer ${token}` },
});
const json = await res.json();
for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_APP_NAME']) {
  const row = (json.envs ?? []).find((e) => e.key === key);
  const val = row?.value ?? '';
  if (key.includes('KEY') || key.includes('URL')) {
    console.log(key + ':', val ? `${val.slice(0, 30)}…(${val.length})` : '(empty)');
  } else {
    console.log(key + ':', val || '(empty)');
  }
}
