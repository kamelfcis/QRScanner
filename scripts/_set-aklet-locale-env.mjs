#!/usr/bin/env node
/**
 * Ensure Aklet Gambary Vercel env has ar/en-only locale config.
 */
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
const targets = ['production', 'preview', 'development'];

const desired = [
  { key: 'NEXT_PUBLIC_TENANT', value: 'aklet' },
  { key: 'NEXT_PUBLIC_DEFAULT_LOCALE', value: 'ar' },
  { key: 'NEXT_PUBLIC_ENABLED_LOCALES', value: 'ar,en' },
];

const listRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, {
  headers: { Authorization: `Bearer ${token}` },
});
const listJson = await listRes.json();
const existing = listJson.envs ?? [];

for (const { key, value } of desired) {
  const matches = existing.filter((row) => row.key === key);
  if (matches.length === 0) {
    const createRes = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key,
        value,
        type: 'plain',
        target: targets,
      }),
    });
    const createJson = await createRes.json();
    console.log(`created ${key}:`, createRes.ok ? 'ok' : createJson);
    continue;
  }

  for (const row of matches) {
    const patchRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${row.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value, target: targets }),
    });
    const patchJson = await patchRes.json();
    console.log(`updated ${key} (${row.id}):`, patchRes.ok ? value : patchJson);
  }
}
