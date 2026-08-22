#!/usr/bin/env node
/**
 * Sync Doctor Burger "قسم البيتزا" category to an exact product list.
 * Usage: node scripts/sync-pizza-menu.mjs [--dry-run]
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { getDoctorBurgerEnv } from './_get-doctorburger-env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');
const envFileArg = process.argv.find((a) => a.startsWith('--env-file='));
const ENV_FILE = envFileArg ? envFileArg.slice('--env-file='.length) : '.env.local';
const EXPECTED_PROJECT = 'haiddzpusamlsstpxlcv';
const CATEGORY_AR = 'قسم البيتزا';
const CATEGORY_EN = 'Pizza';

const TARGET_PRODUCTS = [
  { name_ar: 'بيتزا مارجريتا', name_en: 'Pizza Margherita', price: 90 },
  { name_ar: 'بيتزا ميكس جبن', name_en: 'Pizza Mixed Cheese', price: 110 },
  { name_ar: 'بيتزا شاورما فراخ', name_en: 'Pizza Chicken Shawarma', price: 120 },
  { name_ar: 'بيتزا استريبس', name_en: 'Pizza Strips', price: 130 },
  { name_ar: 'بيتزا تشيكن رانش', name_en: 'Pizza Chicken Ranch', price: 140 },
  { name_ar: 'بيتزا تشيكن باربيكيو', name_en: 'Pizza Chicken BBQ', price: 140 },
  { name_ar: 'بيتزا ميكس فراخ', name_en: 'Pizza Chicken Mix', price: 145 },
  { name_ar: 'بيتزا ميكس لحوم', name_en: 'Pizza Meat Mix', price: 160 },
  { name_ar: 'بيتزا سجق', name_en: 'Pizza Sujuk', price: 110 },
  { name_ar: 'بيتزا سوسيس', name_en: 'Pizza Sausage', price: 110 },
  { name_ar: 'بيتزا تونة', name_en: 'Pizza Tuna', price: 120 },
  { name_ar: 'بيتزا ببروني', name_en: 'Pizza Pepperoni', price: 130 },
];

function loadEnv() {
  const envPath = join(ROOT, ENV_FILE);
  if (!existsSync(envPath)) throw new Error(`${ENV_FILE} not found`);
  const env = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
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

/** Match with or without "بيتزا" prefix. */
function productKey(nameAr) {
  let key = normAr(nameAr);
  key = key.replace(/^بيتزا\s+/, '');
  return key;
}

function defaultDescriptions(product) {
  return {
    description_ar: `${product.name_ar} — بيتزا طازجة من دكتور برجر.`,
    description_en: `${product.name_en} — fresh pizza from Doctor Burger.`,
  };
}

async function ensureCategory(supabase) {
  const { data: existing, error } = await supabase
    .from('categories')
    .select('id, name_ar, name_en')
    .eq('name_ar', CATEGORY_AR);
  if (error) throw new Error(`Category fetch: ${error.message}`);

  if (existing?.length) {
    const keeper = existing[0];
    if (existing.length > 1 && !DRY_RUN) {
      for (const dup of existing.slice(1)) {
        await supabase.from('products').update({ category_id: keeper.id }).eq('category_id', dup.id);
        await supabase.from('categories').delete().eq('id', dup.id);
      }
    }
    return { id: keeper.id, created: false };
  }

  if (DRY_RUN) return { id: 'dry-run-category-id', created: true };

  const { data, error: insertErr } = await supabase
    .from('categories')
    .insert({
      name_ar: CATEGORY_AR,
      name_en: CATEGORY_EN,
      description_ar: 'قسم البيتزا',
      description_en: 'Pizza section',
      is_visible: true,
      sort_order: 0,
    })
    .select('id')
    .single();
  if (insertErr) throw new Error(`Category create: ${insertErr.message}`);
  return { id: data.id, created: true };
}

async function fetchCategoryProducts(supabase, categoryId) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name_ar, name_en, dining_price, takeaway_price, sort_order')
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`Products fetch: ${error.message}`);
  return data ?? [];
}

async function resolveEnv() {
  const local = loadEnv();
  const url = local.NEXT_PUBLIC_SUPABASE_URL;
  if (url?.includes(EXPECTED_PROJECT) && local.SUPABASE_SERVICE_ROLE_KEY) {
    return local;
  }
  console.log('Local env targets another project; loading Doctor Burger credentials from Engaz admin.\n');
  return getDoctorBurgerEnv();
}

async function main() {
  const env = await resolveEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase URL or service role key');
  if (!supabaseUrl.includes(EXPECTED_PROJECT)) {
    throw new Error(`Refusing: expected project ${EXPECTED_PROJECT}, got ${supabaseUrl}`);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const report = {
    dryRun: DRY_RUN,
    category: { created: false, id: null },
    added: [],
    updated: [],
    deleted: [],
    unchanged: [],
    errors: [],
    final: [],
  };

  console.log(`=== Sync ${CATEGORY_AR}${DRY_RUN ? ' (DRY RUN)' : ''} ===\n`);

  const category = await ensureCategory(supabase);
  report.category = { created: category.created, id: category.id };
  console.log(`Category ID: ${category.id}${category.created ? ' (created)' : ''}`);

  const existing = await fetchCategoryProducts(supabase, category.id);
  const existingByKey = new Map(existing.map((p) => [productKey(p.name_ar), p]));
  const targetKeys = new Set(TARGET_PRODUCTS.map((p) => productKey(p.name_ar)));

  if (!DRY_RUN) {
    await supabase
      .from('categories')
      .update({ name_en: CATEGORY_EN })
      .eq('id', category.id);
  }

  for (let i = 0; i < TARGET_PRODUCTS.length; i++) {
    const target = TARGET_PRODUCTS[i];
    const key = productKey(target.name_ar);
    const match = existingByKey.get(key);
    const desc = defaultDescriptions(target);

    const payload = {
      category_id: category.id,
      name_ar: target.name_ar,
      name_en: target.name_en,
      description_ar: desc.description_ar,
      description_en: desc.description_en,
      dining_price: target.price,
      takeaway_price: target.price,
      is_available: true,
      sort_order: i,
    };

    if (!match) {
      report.added.push({ name_ar: target.name_ar, price: target.price });
      if (!DRY_RUN) {
        const { error } = await supabase.from('products').insert(payload);
        if (error) report.errors.push(`Insert "${target.name_ar}": ${error.message}`);
      }
      continue;
    }

    const priceChanged =
      Number(match.dining_price) !== target.price || Number(match.takeaway_price) !== target.price;
    const nameChanged = match.name_ar !== target.name_ar || match.name_en !== target.name_en;

    if (priceChanged || nameChanged || match.sort_order !== i) {
      report.updated.push({
        name_ar: target.name_ar,
        price: target.price,
        previous: {
          name_ar: match.name_ar,
          name_en: match.name_en,
          dining_price: match.dining_price,
          takeaway_price: match.takeaway_price,
        },
      });
      if (!DRY_RUN) {
        const { error } = await supabase.from('products').update(payload).eq('id', match.id);
        if (error) report.errors.push(`Update "${target.name_ar}": ${error.message}`);
      }
    } else {
      report.unchanged.push({ name_ar: target.name_ar, price: target.price });
    }
  }

  for (const prod of existing) {
    if (!targetKeys.has(productKey(prod.name_ar))) {
      report.deleted.push({
        id: prod.id,
        name_ar: prod.name_ar,
        name_en: prod.name_en,
        dining_price: prod.dining_price,
      });
      if (!DRY_RUN) {
        const { error } = await supabase.from('products').delete().eq('id', prod.id);
        if (error) report.errors.push(`Delete "${prod.name_ar}": ${error.message}`);
      }
    }
  }

  const finalProducts = DRY_RUN
    ? TARGET_PRODUCTS.map((p, i) => ({
        name_ar: p.name_ar,
        name_en: p.name_en,
        dining_price: p.price,
        takeaway_price: p.price,
        sort_order: i,
      }))
    : await fetchCategoryProducts(supabase, category.id);

  report.final = finalProducts.map((p) => ({
    name_ar: p.name_ar,
    name_en: p.name_en,
    dining_price: Number(p.dining_price),
    takeaway_price: Number(p.takeaway_price),
  }));

  console.log('\n--- Summary ---');
  console.log(`Added: ${report.added.length}`);
  console.log(`Updated: ${report.updated.length}`);
  console.log(`Deleted: ${report.deleted.length}`);
  console.log(`Unchanged: ${report.unchanged.length}`);
  console.log(`Final count: ${report.final.length}`);

  if (report.added.length) {
    console.log('\nAdded:');
    for (const a of report.added) console.log(`  + ${a.name_ar} — ${a.price} EGP`);
  }
  if (report.updated.length) {
    console.log('\nUpdated:');
    for (const u of report.updated) {
      console.log(
        `  ~ ${u.name_ar} — ${u.price} EGP (was ${u.previous.dining_price}/${u.previous.takeaway_price})`
      );
    }
  }
  if (report.deleted.length) {
    console.log('\nDeleted:');
    for (const d of report.deleted) console.log(`  - ${d.name_ar} (${d.name_en}) — ${d.dining_price} EGP`);
  }
  if (report.errors.length) {
    console.log('\nErrors:');
    for (const e of report.errors) console.log(`  ! ${e}`);
  }

  console.log('\n--- Final list ---');
  for (const p of report.final) {
    console.log(`  ${p.name_ar} | ${p.name_en} | ${p.dining_price} EGP`);
  }

  const outPath = join(ROOT, 'scripts', 'last-pizza-sync-report.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nReport saved to scripts/last-pizza-sync-report.json`);

  if (report.final.length !== TARGET_PRODUCTS.length) {
    console.error(`\nVERIFY FAILED: expected ${TARGET_PRODUCTS.length} products, got ${report.final.length}`);
    process.exit(1);
  }

  const priceOk = report.final.every((p, i) => {
    const expected = TARGET_PRODUCTS[i];
    return (
      productKey(p.name_ar) === productKey(expected.name_ar) &&
      normAr(p.name_ar) === normAr(expected.name_ar) &&
      p.dining_price === expected.price &&
      p.takeaway_price === expected.price
    );
  });
  if (!priceOk) {
    console.error('\nVERIFY FAILED: final prices/names do not match target list');
    process.exit(1);
  }

  console.log('\nVERIFY OK: exactly 12 products with correct prices.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
