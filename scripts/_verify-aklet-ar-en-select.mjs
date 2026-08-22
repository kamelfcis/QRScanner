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

const aklet = loadEnv('.env.aklet.dev.tmp');
const supabase = createClient(aklet.NEXT_PUBLIC_SUPABASE_URL, aklet.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const arEnSelect = `
  id, name_ar, name_en, description_ar, description_en, image_url, banner_url, sort_order, is_visible,
  subcategories:subcategories!category_id(id, category_id, name_ar, name_en, description_ar, description_en, image_url, sort_order, is_visible),
  products:products!category_id(id, category_id, subcategory_id, name_ar, name_en, description_ar, description_en, image_url, dining_price, takeaway_price, is_available, is_popular, is_new, is_bestseller, is_spicy, sort_order)
`;

const { data, error } = await supabase
  .from('categories')
  .select(arEnSelect)
  .eq('is_visible', true)
  .limit(2);

console.log(
  JSON.stringify(
    {
      ok: !error,
      error: error?.message ?? null,
      categories: data?.length ?? 0,
      products: data?.[0]?.products?.length ?? 0,
    },
    null,
    2
  )
);
