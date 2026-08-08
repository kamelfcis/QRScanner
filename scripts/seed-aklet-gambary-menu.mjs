#!/usr/bin/env node
/**
 * Seed full seafood menu for Aklet Gambary.
 * Replaces sample categories/products with the production seafood menu.
 *
 * Usage: node scripts/seed-aklet-gambary-menu.mjs
 *        node scripts/seed-aklet-gambary-menu.mjs --force
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MENU_PATH = join(__dirname, 'data', 'aklet-gambary-menu.json');

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

function loadMenu() {
  const raw = readFileSync(MENU_PATH, 'utf8');
  return JSON.parse(raw);
}

function countProducts(productsByCategory) {
  return Object.values(productsByCategory).reduce((n, list) => n + list.length, 0);
}

async function main() {
  const force = process.argv.includes('--force');
  const { categories, products: productsByCategory } = loadMenu();
  const expectedCategories = categories.length;
  const expectedProducts = countProducts(productsByCategory);

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

  const hasSeafoodMenu =
    existingCatCount === expectedCategories && existingProdCount === expectedProducts;

  if (hasSeafoodMenu && !force) {
    console.log('Seafood menu already seeded — skipping (use --force to re-seed).');
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
      categories.map(({ name_ar, name_en, sort_order }) => ({
        name_ar,
        name_en,
        sort_order,
        is_visible: true,
      })),
    )
    .select('id, name_en');

  if (catErr) throw catErr;

  const catIdByKey = {};
  for (const cat of insertedCats) {
    const def = categories.find((c) => c.name_en === cat.name_en);
    if (def) catIdByKey[def.key] = cat.id;
  }

  const allProducts = [];
  for (const [key, items] of Object.entries(productsByCategory)) {
    const category_id = catIdByKey[key];
    if (!category_id) throw new Error(`Missing category id for key: ${key}`);

    for (const item of items) {
      allProducts.push({
        category_id,
        name_ar: item.name_ar,
        name_en: item.name_en,
        description_ar: item.description_ar ?? null,
        description_en: item.description_en ?? null,
        dining_price: item.price,
        takeaway_price: item.price,
        is_available: true,
        sort_order: item.sort_order,
      });
    }
  }

  const { data: insertedProds, error: prodErr } = await supabase
    .from('products')
    .insert(allProducts)
    .select('id');

  if (prodErr) throw prodErr;

  console.log(`Seeded ${insertedCats.length} categories and ${insertedProds.length} products.`);
  console.log(`Expected: ${expectedCategories} categories, ${expectedProducts} products.`);

  if (insertedCats.length !== expectedCategories || insertedProds.length !== expectedProducts) {
    throw new Error('Seed counts do not match expected menu size.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
