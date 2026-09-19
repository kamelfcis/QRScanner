#!/usr/bin/env node
/**
 * Full Ala Keefak menu seed (9 categories).
 * Usage: node scripts/sync-ala-keefak-menu.mjs [--dry-run]
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');
const EXPECTED_REF = 'pytmkruoyyhxfktnkpuu';

const BOX_SIZES = [
  { suffix_ar: 'صغير', suffix_en: 'Small', priceFactor: 1 },
  { suffix_ar: 'وسط', suffix_en: 'Medium', priceFactor: 1.35 },
  { suffix_ar: 'كبير', suffix_en: 'Large', priceFactor: 1.7 },
  { suffix_ar: 'عائلي', suffix_en: 'Family', priceFactor: 2.2 },
];

const MACARONI_SANDWICHES = [
  { ar: 'سندوتش مكرونه ساده', en: 'Plain Macaroni Sandwich', price: 35 },
  { ar: 'سندوتش مكرونه بالكبده', en: 'Macaroni Sandwich with Liver', price: 42 },
  { ar: 'سندوتش مكرونه بالكفته فراخ', en: 'Macaroni Sandwich with Chicken Kofta', price: 45 },
  { ar: 'سندوتش مكرونه بالكفته لحمه', en: 'Macaroni Sandwich with Beef Kofta', price: 48 },
  { ar: 'سندوتش مكرونه بالسجق', en: 'Macaroni Sandwich with Sausage', price: 40 },
  { ar: 'سندوتش مكرونه بالكلاوي', en: 'Macaroni Sandwich with Kidneys', price: 44 },
  { ar: 'سندوتش مكرونه مفروم فراخ', en: 'Macaroni Sandwich with Minced Chicken', price: 43 },
  { ar: 'سندوتش مكرونه مفروم لحمه', en: 'Macaroni Sandwich with Minced Beef', price: 46 },
  { ar: 'سندوتش مكرونه مشكل لحوم', en: 'Macaroni Sandwich with Mixed Meats', price: 50 },
];

const MEAT_SANDWICHES = [
  { ar: 'سندوتش كبده', en: 'Liver Sandwich', price: 38 },
  { ar: 'سندوتش كفته فراخ', en: 'Chicken Kofta Sandwich', price: 42 },
  { ar: 'سندوتش كفته لحمه', en: 'Beef Kofta Sandwich', price: 45 },
  { ar: 'سندوتش سجق', en: 'Sausage Sandwich', price: 36 },
  { ar: 'سندوتش حواوشي فراخ', en: 'Chicken Hawawshi Sandwich', price: 48 },
  { ar: 'سندوتش حواوشي لحمه', en: 'Beef Hawawshi Sandwich', price: 50 },
  { ar: 'سندوتش كلاوي', en: 'Kidney Sandwich', price: 40 },
  { ar: 'سندوتش مفروم فراخ', en: 'Minced Chicken Sandwich', price: 41 },
  { ar: 'سندوتش مفروم لحمه', en: 'Minced Beef Sandwich', price: 44 },
  { ar: 'سندوتش مشكل لحوم', en: 'Mixed Meats Sandwich', price: 52 },
];

const MACARONI_BOX_BASES = [
  { ar: 'علبه مكرونه ساده', en: 'Plain Macaroni Box', basePrice: 45 },
  { ar: 'علبه مكرونه بالكبده', en: 'Macaroni Box with Liver', basePrice: 55 },
  { ar: 'علبه مكرونه بالكفته فراخ', en: 'Macaroni Box with Chicken Kofta', basePrice: 58 },
  { ar: 'علبه مكرونه بالكفته لحمه', en: 'Macaroni Box with Beef Kofta', basePrice: 62 },
  { ar: 'علبه مكرونه بالسجق', en: 'Macaroni Box with Sausage', basePrice: 52 },
  { ar: 'علبه مكرونه بالكلاوي', en: 'Macaroni Box with Kidneys', basePrice: 56 },
  { ar: 'علبه مكرونه بمفروم لحمه', en: 'Macaroni Box with Minced Beef', basePrice: 60 },
  { ar: 'علبه مكرونه بمفروم فراخ', en: 'Macaroni Box with Minced Chicken', basePrice: 57 },
  { ar: 'علبه مكرونه بالبانيه', en: 'Macaroni Box with Pane', basePrice: 54 },
  { ar: 'علبه مكرونه مشكل لحوم', en: 'Macaroni Box with Mixed Meats', basePrice: 65 },
];

const SYRIAN_SANDWICHES = [
  { ar: 'سندوتش كبده', en: 'Syrian Liver Sandwich', price: 40 },
  { ar: 'سندوتش كفته فراخ', en: 'Syrian Chicken Kofta Sandwich', price: 44 },
  { ar: 'سندوتش كفته لحمه', en: 'Syrian Beef Kofta Sandwich', price: 47 },
  { ar: 'سندوتش سجق', en: 'Syrian Sausage Sandwich', price: 38 },
  { ar: 'سندوتش حواوشي فراخ', en: 'Syrian Chicken Hawawshi Sandwich', price: 50 },
  { ar: 'سندوتش حواوشي لحمه', en: 'Syrian Beef Hawawshi Sandwich', price: 52 },
  { ar: 'سندوتش كلاوي', en: 'Syrian Kidney Sandwich', price: 42 },
  { ar: 'سندوتش مفروم فراخ', en: 'Syrian Minced Chicken Sandwich', price: 43 },
  { ar: 'سندوتش مفروم لحمه', en: 'Syrian Minced Beef Sandwich', price: 46 },
  { ar: 'سندوتش مشكل لحوم', en: 'Syrian Mixed Meats Sandwich', price: 54 },
  { ar: 'سندوتش بانيه', en: 'Pane Sandwich', price: 45 },
  { ar: 'سندوتش زنجر', en: 'Zinger Sandwich', price: 48 },
  { ar: 'سندوتش بطاطس', en: 'Potato Sandwich', price: 28 },
  { ar: 'سندوتش برجر فراخ', en: 'Chicken Burger Sandwich', price: 55 },
  { ar: 'سندوتش برجر لحمه', en: 'Beef Burger Sandwich', price: 58 },
  { ar: 'سندوتش كرسبي', en: 'Crispy Sandwich', price: 46 },
];

const WEIGHT_MEATS = [
  { ar: 'كبده', en: 'Liver', pricePerKg: 320 },
  { ar: 'كفته فراخ', en: 'Chicken Kofta', pricePerKg: 340 },
  { ar: 'كفته لحمه', en: 'Beef Kofta', pricePerKg: 360 },
  { ar: 'سجق', en: 'Sausage', pricePerKg: 300 },
  { ar: 'كلاوي', en: 'Kidneys', pricePerKg: 310 },
  { ar: 'مفروم لحمه', en: 'Minced Beef', pricePerKg: 350 },
  { ar: 'مفروم فراخ', en: 'Minced Chicken', pricePerKg: 330 },
  { ar: 'مشكل لحوم', en: 'Mixed Meats', pricePerKg: 380 },
];

const GRILLED_CHICKEN = [
  { ar: 'فرخه كامله', en: 'Whole Grilled Chicken', price: 220 },
  { ar: 'نص فرخه', en: 'Half Grilled Chicken', price: 120 },
  { ar: 'ربع فرخه ورك', en: 'Quarter Chicken (Leg)', price: 65 },
  { ar: 'ربع فرخه صدر', en: 'Quarter Chicken (Breast)', price: 70 },
  { ar: 'نص فرخه صدرين', en: 'Half Chicken (Two Breasts)', price: 95 },
  { ar: 'نص فرخه وركين', en: 'Half Chicken (Two Legs)', price: 90 },
  { ar: 'ثلاث ارباع فرخه صدرين وورك', en: 'Three-Quarter Chicken (Breasts & Leg)', price: 165 },
  { ar: 'ثلاث ارباع فرخه وركين وصدر', en: 'Three-Quarter Chicken (Legs & Breast)', price: 160 },
];

const EXTRAS = [
  { ar: 'سلطه', en: 'Salad', price: 15 },
  { ar: 'طرشي', en: 'Pickles', price: 10 },
  { ar: 'طحينه', en: 'Tahini', price: 12 },
  { ar: 'عيش', en: 'Bread', price: 8 },
  { ar: 'صلصه', en: 'Sauce', price: 10 },
  { ar: 'شطه', en: 'Hot Sauce', price: 8 },
  { ar: 'باكيت بطاطس', en: 'Potato Pack', price: 25 },
  { ar: 'مياه سلطه', en: 'Salad Water Dressing', price: 12 },
  { ar: 'طماطم متبله', en: 'Seasoned Tomatoes', price: 15 },
];

const DRINKS = [
  { ar: 'كانز', en: 'Soft Drink Can', price: 18 },
  { ar: 'لتر', en: '1L Soft Drink', price: 28 },
  { ar: '2.5 لتر', en: '2.5L Soft Drink', price: 35 },
  { ar: 'مياه كبيره', en: 'Large Water', price: 12 },
  { ar: 'مياه صغيره', en: 'Small Water', price: 8 },
];

function expandBoxProducts() {
  const products = [];
  for (const base of MACARONI_BOX_BASES) {
    for (const size of BOX_SIZES) {
      const price = Math.round(base.basePrice * size.priceFactor);
      products.push({
        name_ar: `${base.ar} - ${size.suffix_ar}`,
        name_en: `${base.en} - ${size.suffix_en}`,
        price,
      });
    }
  }
  return products;
}

const MENU = [
  {
    name_ar: 'سندوتشات المكرونه',
    name_en: 'Macaroni Sandwiches',
    description_ar: 'اختر عيش بلدي أو عيش سوري',
    description_en: 'Choose baladi bread or Syrian bread',
    products: MACARONI_SANDWICHES.map((p) => ({
      name_ar: p.ar,
      name_en: p.en,
      price: p.price,
    })),
  },
  {
    name_ar: 'سندوتشات اللحوم',
    name_en: 'Meat Sandwiches',
    description_ar: 'اختر عيش بلدي أو عيش ابيض',
    description_en: 'Choose baladi bread or white bread',
    products: MEAT_SANDWICHES.map((p) => ({
      name_ar: p.ar,
      name_en: p.en,
      price: p.price,
    })),
  },
  {
    name_ar: 'العلب المكرونه',
    name_en: 'Macaroni Boxes',
    description_ar: 'متوفر بأربع أحجام: صغير، وسط، كبير، عائلي',
    description_en: 'Available in four sizes: small, medium, large, family',
    products: expandBoxProducts(),
  },
  {
    name_ar: 'سندوتشات السوري',
    name_en: 'Syrian Sandwiches',
    description_ar: 'اختر عيش سوري أو عيش فينو',
    description_en: 'Choose Syrian bread or fino bread',
    products: SYRIAN_SANDWICHES.map((p) => ({
      name_ar: p.ar,
      name_en: p.en,
      price: p.price,
    })),
  },
  {
    name_ar: 'سندوتشات المكرونه السوري',
    name_en: 'Syrian Macaroni Sandwiches',
    description_ar: 'على عيش سوري',
    description_en: 'Served on Syrian bread',
    products: MACARONI_SANDWICHES.map((p) => ({
      name_ar: p.ar,
      name_en: `${p.en} (Syrian Bread)`,
      price: p.price + 3,
    })),
  },
  {
    name_ar: 'طلبات اللحوم',
    name_en: 'Meat by Weight',
    description_ar: 'بالوزن: ربع كilo، نص كilo، ثلاثة ارباع كilo، كilo',
    description_en: 'By weight: quarter, half, three-quarter, or full kilo',
    weightPricing: true,
    products: WEIGHT_MEATS.map((p) => ({
      name_ar: p.ar,
      name_en: p.en,
      price_per_kg: p.pricePerKg,
      weight_options_g: [250, 500, 750, 1000],
    })),
  },
  {
    name_ar: 'الفراخ المشويه',
    name_en: 'Grilled Chicken',
    description_ar: 'فراخ مشوية طازجة',
    description_en: 'Fresh grilled chicken',
    products: GRILLED_CHICKEN.map((p) => ({
      name_ar: p.ar,
      name_en: p.en,
      price: p.price,
    })),
  },
  {
    name_ar: 'اضافات',
    name_en: 'Extras',
    description_ar: 'إضافات جانبية',
    description_en: 'Side extras',
    products: EXTRAS.map((p) => ({
      name_ar: p.ar,
      name_en: p.en,
      price: p.price,
    })),
  },
  {
    name_ar: 'مشروبات',
    name_en: 'Drinks',
    description_ar: 'مشروبات باردة',
    description_en: 'Cold beverages',
    products: DRINKS.map((p) => ({
      name_ar: p.ar,
      name_en: p.en,
      price: p.price,
    })),
  },
];

function loadEnv() {
  const env = {};
  for (const name of ['.env.local', '.env']) {
    const p = join(ROOT, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

function normAr(s) {
  return (s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
}

function productKey(nameAr) {
  return normAr(nameAr);
}

function productPayload(categoryId, product, sortOrder, weightPricing) {
  const base = {
    category_id: categoryId,
    name_ar: product.name_ar,
    name_en: product.name_en,
    description_ar: product.name_ar,
    description_en: product.name_en,
    is_available: true,
    sort_order: sortOrder,
  };

  if (weightPricing) {
    const minPrice = Math.round((product.price_per_kg * product.weight_options_g[0]) / 1000);
    return {
      ...base,
      dining_price: minPrice,
      takeaway_price: minPrice,
      price_per_kg: product.price_per_kg,
      weight_options_g: product.weight_options_g,
      has_size_options: false,
    };
  }

  return {
    ...base,
    dining_price: product.price,
    takeaway_price: product.price,
    has_size_options: false,
  };
}

async function ensureCategory(supabase, category, sortOrder) {
  const { data: existing, error } = await supabase
    .from('categories')
    .select('id, name_ar')
    .eq('name_ar', category.name_ar);
  if (error) throw new Error(`Category fetch "${category.name_ar}": ${error.message}`);

  const payload = {
    name_ar: category.name_ar,
    name_en: category.name_en,
    description_ar: category.description_ar,
    description_en: category.description_en,
    is_visible: true,
    sort_order: sortOrder,
  };

  if (existing?.length) {
    const keeper = existing[0];
    if (!DRY_RUN) {
      await supabase.from('categories').update(payload).eq('id', keeper.id);
    }
    return { id: keeper.id, created: false };
  }

  if (DRY_RUN) return { id: `dry-${sortOrder}`, created: true };

  const { data, error: insertErr } = await supabase
    .from('categories')
    .insert(payload)
    .select('id')
    .single();
  if (insertErr) throw new Error(`Category create "${category.name_ar}": ${insertErr.message}`);
  return { id: data.id, created: true };
}

async function fetchCategoryProducts(supabase, categoryId) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name_ar, name_en, dining_price, takeaway_price, price_per_kg, weight_options_g, sort_order')
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`Products fetch: ${error.message}`);
  return data ?? [];
}

async function syncCategoryProducts(supabase, categoryId, products, weightPricing, report) {
  const existing = await fetchCategoryProducts(supabase, categoryId);
  const existingByKey = new Map(existing.map((p) => [productKey(p.name_ar), p]));
  const targetKeys = new Set(products.map((p) => productKey(p.name_ar)));

  for (let i = 0; i < products.length; i++) {
    const target = products[i];
    const key = productKey(target.name_ar);
    const match = existingByKey.get(key);
    const payload = productPayload(categoryId, target, i, weightPricing);

    if (!match) {
      report.added.push({ name_ar: target.name_ar, category_id: categoryId });
      if (!DRY_RUN) {
        const { error } = await supabase.from('products').insert(payload);
        if (error) report.errors.push(`Insert "${target.name_ar}": ${error.message}`);
      }
      continue;
    }

    report.updated.push({ name_ar: target.name_ar, category_id: categoryId });
    if (!DRY_RUN) {
      const { error } = await supabase.from('products').update(payload).eq('id', match.id);
      if (error) report.errors.push(`Update "${target.name_ar}": ${error.message}`);
    }
  }

  for (const prod of existing) {
    if (!targetKeys.has(productKey(prod.name_ar))) {
      report.deleted.push({ id: prod.id, name_ar: prod.name_ar });
      if (!DRY_RUN) {
        const { error } = await supabase.from('products').delete().eq('id', prod.id);
        if (error) report.errors.push(`Delete "${prod.name_ar}": ${error.message}`);
      }
    }
  }
}

async function main() {
  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl?.includes(EXPECTED_REF) || !serviceKey) {
    throw new Error(`Refusing: expected Supabase ref ${EXPECTED_REF}`);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const report = {
    dryRun: DRY_RUN,
    categories: [],
    added: [],
    updated: [],
    deleted: [],
    errors: [],
    totals: { categories: 0, products: 0 },
  };

  console.log(`=== Ala Keefak menu sync${DRY_RUN ? ' (DRY RUN)' : ''} ===\n`);

  for (let i = 0; i < MENU.length; i++) {
    const category = MENU[i];
    const cat = await ensureCategory(supabase, category, i);
    report.categories.push({
      name_ar: category.name_ar,
      id: cat.id,
      created: cat.created,
      productCount: category.products.length,
    });
    console.log(`[${i + 1}/${MENU.length}] ${category.name_ar} — ${category.products.length} products`);
    await syncCategoryProducts(supabase, cat.id, category.products, category.weightPricing === true, report);
  }

  const { data: counts } = await supabase.from('categories').select('id', { count: 'exact', head: true });
  const { count: productCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true });

  report.totals.categories = counts?.length ?? MENU.length;
  report.totals.products = productCount ?? MENU.reduce((n, c) => n + c.products.length, 0);

  const outPath = join(ROOT, 'scripts', 'last-ala-keefak-menu-sync-report.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('\n--- Summary ---');
  console.log(`Categories: ${MENU.length}`);
  console.log(`Expected products: ${MENU.reduce((n, c) => n + c.products.length, 0)}`);
  console.log(`DB products: ${report.totals.products}`);
  console.log(`Added: ${report.added.length}, Updated: ${report.updated.length}, Deleted: ${report.deleted.length}`);
  if (report.errors.length) {
    console.log('\nErrors:');
    for (const e of report.errors) console.log(`  ! ${e}`);
    process.exit(1);
  }
  console.log(`\nReport: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
