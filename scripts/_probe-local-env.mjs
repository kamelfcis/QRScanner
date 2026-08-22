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

const local = { ...loadEnv('.env'), ...loadEnv('.env.local') };
const url = local.NEXT_PUBLIC_SUPABASE_URL || '';
const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
console.log('local supabase ref:', match?.[1] ?? '(none)');
console.log('has anon key:', Boolean(local.NEXT_PUBLIC_SUPABASE_ANON_KEY));
console.log('has service key:', Boolean(local.SUPABASE_SERVICE_ROLE_KEY?.trim()));
console.log('local tenant:', local.NEXT_PUBLIC_TENANT || '(unset)');
console.log('local app name:', local.NEXT_PUBLIC_APP_NAME || '(unset)');
