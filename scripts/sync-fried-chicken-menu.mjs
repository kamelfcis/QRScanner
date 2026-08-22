#!/usr/bin/env node
/**
 * Sync Doctor Burger "فرايد تشيكن" category to an exact product list.
 * Usage: node scripts/sync-fried-chicken-menu.mjs [--dry-run]
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { getDoctorBurgerEnv } from './_get-doctorburger-env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');
const EXPECTED_PROJECT = 'haiddzpusamlsstpxlcv';

const CATEGORY_AR = 'فرايد تشيكن';
const CATEGORY_EN = 'Fried Chicken';

const TARGET_PRODUCTS = [
  {
    name_ar: 'تشيكن كلاسيك',
    name_en: 'Classic Chicken',
    dining_price: 90,
    takeaway_price: 130,
  },
  {
    name_ar: 'تشيكن هالبينو',
    name_en: 'Jalapeño Chicken',
    dining_price: 95,
    takeaway_price: 125,
  },
  {
    name_ar: 'تشيكن ستيكس',
    name_en: 'Chicken Steaks',
    dining_price: 100,
    takeaway_price: 140,
  },
  {
    name_ar: 'تشيكن أونيون',
    name_en: 'Onion Chicken',
    dining_price: 100,
    takeaway_price: 140,
  },
  {
    name_ar: 'تشيكن رانش',
    name_en: 'Chicken Ranch',
    dining_price: 90,
    takeaway_price: 120,
  },
];

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
    .replace(/\.$/, '')
    .replace(/\s+/g, ' ')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
}

function productKey(nameAr) {
  return normAr(nameAr);
}

function defaultDescriptions(product) {
  return {
    description_ar: `${product.name_ar} — فرايد تشيكن مقرمش من دكتور برجر.`,
    description_en: `${product.name_en} — crispy fried chicken from Doctor Burger.`,
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
    if (!DRY_RUN) {
      await supabase
        .from('categories')
        .update({
          name_en: CATEGORY_EN,
          description_ar: 'فرايد تشيكن مقرمش',
          description_en: 'Crispy fried chicken',
          is_visible: true,
        })
        .eq('id', keeper.id);
    }
    return { id: keeper.id, created: false };
  }

  if (DRY_RUN) return { id: 'dry-run-category-id', created: true };

  const { data, error: insertErr } = await supabase
    .from('categories')
    .insert({
      name_ar: CATEGORY_AR,
      name_en: CATEGORY_EN,
      description_ar: 'فرايد تشيكن مقرمش',
      description_en: 'Crispy fried chicken',
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
    .select(
      'id, name_ar, name_en, description_ar, description_en, dining_price, takeaway_price, sort_order'
    )
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
    upserted: [],
    deleted: [],
    unchanged: [],
    errors: [],
    final: [],
  };

  console.log(`=== Sync ${CATEGORY_AR}${DRY_RUN ? ' (DRY RUN)' : ''} ===\n`);

  const category = await ensureCategory(supabase);
  report.category = { created: category.created, id: category.id };
  console.log(`Category ID: ${category.id}${category.created ? ' (created)' : ''}`);

  const existing =
    DRY_RUN && category.created ? [] : await fetchCategoryProducts(supabase, category.id);
  const existingByKey = new Map(existing.map((p) => [productKey(p.name_ar), p]));
  const targetKeys = new Set(TARGET_PRODUCTS.map((p) => productKey(p.name_ar)));

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
      dining_price: target.dining_price,
      takeaway_price: target.takeaway_price,
      is_available: true,
      sort_order: i,
    };

    if (!match) {
      report.upserted.push({ action: 'insert', ...target });
      if (!DRY_RUN) {
        const { error } = await supabase.from('products').insert(payload);
        if (error) report.errors.push(`Insert "${target.name_ar}": ${error.message}`);
      }
      continue;
    }

    const priceChanged =
      Number(match.dining_price) !== target.dining_price ||
      Number(match.takeaway_price) !== target.takeaway_price;
    const nameChanged = match.name_ar !== target.name_ar || match.name_en !== target.name_en;
    const descMissing = !match.description_ar?.trim() || !match.description_en?.trim();

    if (priceChanged || nameChanged || match.sort_order !== i || descMissing) {
      report.upserted.push({
        action: 'update',
        ...target,
        previous: {
          name_ar: match.name_ar,
          name_en: match.name_en,
          dining_price: match.dining_price,
          takeaway_price: match.takeaway_price,
        },
      });
      if (!DRY_RUN) {
        const updatePayload = { ...payload };
        if (match.description_ar?.trim()) delete updatePayload.description_ar;
        if (match.description_en?.trim()) delete updatePayload.description_en;
        const { error } = await supabase.from('products').update(updatePayload).eq('id', match.id);
        if (error) report.errors.push(`Update "${target.name_ar}": ${error.message}`);
      }
    } else {
      report.unchanged.push({ name_ar: target.name_ar });
    }
  }

  for (const prod of existing) {
    if (!targetKeys.has(productKey(prod.name_ar))) {
      report.deleted.push({
        id: prod.id,
        name_ar: prod.name_ar,
        name_en: prod.name_en,
        dining_price: prod.dining_price,
        takeaway_price: prod.takeaway_price,
      });
      if (!DRY_RUN) {
        const { error } = await supabase.from('products').delete().eq('id', prod.id);
        if (error) report.errors.push(`Delete "${prod.name_ar}": ${error.message}`);
      }
    }
  }

  const finalProducts = DRY_RUN
    ? TARGET_PRODUCTS
    : await fetchCategoryProducts(supabase, category.id);

  report.final = finalProducts.map((p) => ({
    name_ar: p.name_ar,
    name_en: p.name_en,
    dining_price: Number(p.dining_price),
    takeaway_price: Number(p.takeaway_price),
  }));

  console.log('\n--- Summary ---');
  console.log(`Upserted: ${report.upserted.length}`);
  console.log(`Deleted: ${report.deleted.length}`);
  console.log(`Unchanged: ${report.unchanged.length}`);
  console.log(`Final count: ${report.final.length}`);

  if (report.upserted.length) {
    console.log('\nUpserted:');
    for (const u of report.upserted) {
      console.log(
        `  ${u.action === 'insert' ? '+' : '~'} ${u.name_ar} | ${u.name_en} | dine ${u.dining_price} | takeaway ${u.takeaway_price}`
      );
    }
  }
  if (report.deleted.length) {
    console.log('\nDeleted:');
    for (const d of report.deleted) {
      console.log(`  - ${d.name_ar} (${d.name_en})`);
    }
  }
  if (report.errors.length) {
    console.log('\nErrors:');
    for (const e of report.errors) console.log(`  ! ${e}`);
  }

  console.log('\n--- Final list ---');
  for (const p of report.final) {
    console.log(
      `  ${p.name_ar} | ${p.name_en} | dine ${p.dining_price} | takeaway ${p.takeaway_price}`
    );
  }

  const outPath = join(ROOT, 'scripts', 'last-fried-chicken-sync-report.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nReport saved to scripts/last-fried-chicken-sync-report.json`);

  if (report.final.length !== TARGET_PRODUCTS.length) {
    console.error(`\nVERIFY FAILED: expected ${TARGET_PRODUCTS.length} products, got ${report.final.length}`);
    process.exit(1);
  }

  const priceOk = report.final.every((p, i) => {
    const expected = TARGET_PRODUCTS[i];
    return (
      productKey(p.name_ar) === productKey(expected.name_ar) &&
      p.dining_price === expected.dining_price &&
      p.takeaway_price === expected.takeaway_price
    );
  });
  if (!priceOk) {
    console.error('\nVERIFY FAILED: final prices/names do not match target list');
    process.exit(1);
  }
  if (report.errors.length) {
    console.error('\nVERIFY FAILED: errors occurred during sync');
    process.exit(1);
  }

  console.log('\nVERIFY OK: exactly 5 products with correct prices.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
