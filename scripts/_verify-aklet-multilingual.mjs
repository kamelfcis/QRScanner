#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
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

const env = { ...loadEnv('.env.aklet.dev.tmp') };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const ref = url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? 'unknown';

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const catalogSelect = `
  id, name_ar, name_en, name_fr, name_nl,
  subcategories:subcategories!category_id(id, name_fr, name_nl)
`;

const { error: catErr } = await supabase.from('categories').select(catalogSelect).limit(1);
const { error: prodErr } = await supabase.from('products').select('name_fr, name_nl').limit(1);

console.log(JSON.stringify({ ref, categoriesError: catErr?.message ?? null, productsError: prodErr?.message ?? null }, null, 2));
