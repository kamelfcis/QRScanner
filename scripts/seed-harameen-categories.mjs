#!/usr/bin/env node
/**
 * Seed empty supermarket categories for Harameen Wholesale Market.
 * Clears 003 sample products/categories and inserts 12 category rows only.
 *
 * Usage: node scripts/seed-harameen-categories.mjs
 *        node scripts/seed-harameen-categories.mjs --force
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CATEGORIES_PATH = join(__dirname, 'data', 'harameen-categories.json');

function loadEnv() {
  const envPath = join(ROOT, '.env.local');
  if (!existsSync(envPath)) throw new Error('.env.local not found');
  const env = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function loadCategories() {
  const raw = readFileSync(CATEGORIES_PATH, 'utf8');
  const { categories } = JSON.parse(raw);
  return categories;
}

async function main() {
  const force = process.argv.includes('--force');
  const categories = loadCategories();
  const expectedCategories = categories.length;
  const expectedProducts = 0;

  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { count: existingCatCount } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true });

  const { count: existingProdCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  console.log(`Existing: ${existingCatCount ?? 0} categories, ${existingProdCount ?? 0} products`);

  const hasHarameenCategories =
    existingCatCount === expectedCategories && (existingProdCount ?? 0) === 0;

  if (hasSeafoodMenu && !force) {
    console.log('Harameen categories already seeded — skipping (use --force to re-seed).');
    return;
  }

  const sentinel = '00000000-0000-0000-0000-000000000000';

  const { error: delProdErr } = await supabase.from('products').delete().neq('id', sentinel);
  if (delProdErr) throw delProdErr;

  const { error: delSubErr } = await supabase
    .from('subcategories')
    .delete()
    .neq('id', sentinel);
  if (delSubErr) throw delSubErr;

  const { error: delCatErr } = await supabase.from('categories').delete().neq('id', sentinel);
  if (delCatErr) throw delCatErr;

  console.log('Cleared existing categories and products.');

  const { data: insertedCats, error: catErr } = await supabase
    .from('categories')
    .insert(
      categories.map(({ name_ar, name_en, sort_order, description_ar, description_en }) => ({
        name_ar,
        name_en,
        sort_order,
        description_ar: description_ar ?? null,
        description_en: description_en ?? null,
        is_visible: true,
      })),
    )
    .select('id, name_en');

  if (catErr) throw catErr;

  console.log(`Seeded ${insertedCats.length} categories (no products).`);
  console.log(`Expected: ${expectedCategories} categories, 0 products.`);

  if (insertedCats.length !== expectedCategories) {
    throw new Error('Seed category count does not match expected.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
