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
if (!token) {
  console.error('no VERCEL_TOKEN');
  process.exit(1);
}

const projectId = 'prj_FNonretsEgvpkDj2BgVd35DYW7Aj';
const keys = [
  'NEXT_PUBLIC_TENANT',
  'NEXT_PUBLIC_DEFAULT_LOCALE',
  'NEXT_PUBLIC_ENABLED_LOCALES',
  'NEXT_PUBLIC_SUPABASE_URL',
];

const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env?decrypt=true`, {
  headers: { Authorization: `Bearer ${token}` },
});
const json = await res.json();

for (const key of keys) {
  for (const target of ['production', 'preview', 'development']) {
    const rows = (json.envs ?? []).filter(
      (e) => e.key === key && (e.target ?? []).includes(target)
    );
    if (rows.length) {
      console.log(`${key} [${target}]: ${rows.map((r) => r.value).join(' | ')}`);
    }
  }
}
