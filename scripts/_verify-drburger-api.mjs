#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[t.slice(0, i).trim()] = val;
  }
  return env;
}

const env = loadEnv(resolve(ROOT, '.env.vercel.check'));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const tests = [
  {
    name: 'categories fr/nl',
    path:
      '/rest/v1/categories?select=id,name_fr,name_nl,description_fr,description_nl&is_visible=eq.true&limit=2',
  },
  {
    name: 'products fr/nl',
    path:
      '/rest/v1/products?select=id,name_fr,name_nl,description_fr,description_nl&is_available=eq.true&limit=2',
  },
];

for (const test of tests) {
  const res = await fetch(`${url}${test.path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const body = await res.text();
  console.log(`${test.name}: ${res.status} ${body.slice(0, 120)}`);
}
