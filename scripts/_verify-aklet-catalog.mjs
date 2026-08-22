#!/usr/bin/env node
/** Verify Aklet catalog queries work with ar/en-only columns. */
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

const env = { ...loadEnv('.env.aklet.dev.tmp'), ...loadEnv('.env'), ...loadEnv('.env.local') };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ref = url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? 'unknown';

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const catalogSelect = `
  id, name_ar, name_en, description_ar, description_en, image_url, banner_url, sort_order, is_visible, created_at, updated_at,
  subcategories:subcategories!category_id(
    id, category_id, name_ar, name_en, description_ar, description_en, image_url, sort_order, is_visible, created_at, updated_at
  ),
  products:products!category_id(
    id, category_id, subcategory_id, name_ar, name_en, description_ar, description_en,
    image_url, dining_price, takeaway_price, has_size_options, is_available, is_popular, is_new, is_bestseller,
    is_spicy, sort_order, created_at, updated_at
  )
`;

const { data, error } = await supabase
  .from('categories')
  .select(catalogSelect)
  .eq('is_visible', true)
  .limit(2);

const { error: frErr } = await supabase.from('subcategories').select('name_fr, name_nl').limit(1);

console.log(
  JSON.stringify(
    {
      ref,
      catalogOk: !error,
      catalogError: error?.message ?? null,
      categoryCount: data?.length ?? 0,
      frColumnsExist: !frErr,
      frColumnError: frErr?.message ?? null,
    },
    null,
    2
  )
);

if (error) process.exit(1);
