#!/usr/bin/env node
/**
 * Sync Doctor Burger "بيف برجر" category and remove "الساندوتشات".
 * Usage: node scripts/sync-beef-burger-menu.mjs [--dry-run]
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

const BEEF_CATEGORY_AR = 'بيف برجر';
const BEEF_CATEGORY_EN = 'Beef Burger';
const SANDWICHES_CATEGORY_AR = 'الساندوتشات';

const TARGET_PRODUCTS = [
  {
    name_ar: 'بيف تكساس',
    name_en: 'Beef Texas',
    dining_price: 90,
    takeaway_price: 130,
  },
  {
    name_ar: 'بيف هالبينو',
    name_en: 'Beef Jalapeño',
    dining_price: 90,
    takeaway_price: 120,
  },
  {
    name_ar: 'بيف ستيكس',
    name_en: 'Beef Steaks',
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
    description_ar: `${product.name_ar} — برجر لحم بقري طازج من دكتور برجر.`,
    description_en: `${product.name_en} — fresh beef burger from Doctor Burger.`,
  };
}

async function ensureCategory(supabase, nameAr, nameEn, descriptions) {
  const { data: existing, error } = await supabase
    .from('categories')
    .select('id, name_ar, name_en')
    .eq('name_ar', nameAr);
  if (error) throw new Error(`Category fetch "${nameAr}": ${error.message}`);

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
          name_en: nameEn,
          description_ar: descriptions.description_ar,
          description_en: descriptions.description_en,
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
      name_ar: nameAr,
      name_en: nameEn,
      description_ar: descriptions.description_ar,
      description_en: descriptions.description_en,
      is_visible: true,
      sort_order: 0,
    })
    .select('id')
    .single();
  if (insertErr) throw new Error(`Category create "${nameAr}": ${insertErr.message}`);
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

async function fetchCategoriesByName(supabase, nameAr) {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name_ar, name_en')
    .eq('name_ar', nameAr);
  if (error) throw new Error(`Category fetch "${nameAr}": ${error.message}`);
  return data ?? [];
}

async function fetchSubcategories(supabase, categoryId) {
  const { data, error } = await supabase
    .from('subcategories')
    .select('id, name_ar, name_en, category_id')
    .eq('category_id', categoryId);
  if (error) throw new Error(`Subcategories fetch: ${error.message}`);
  return data ?? [];
}

async function deleteProductsInSubcategory(supabase, subcategoryId, report, label) {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name_ar, name_en')
    .eq('subcategory_id', subcategoryId);
  if (error) throw new Error(`Subcategory products fetch: ${error.message}`);

  for (const prod of products ?? []) {
    report.deletedProducts.push({
      category: label,
      id: prod.id,
      name_ar: prod.name_ar,
      name_en: prod.name_en,
    });
    if (!DRY_RUN) {
      const { error: delErr } = await supabase.from('products').delete().eq('id', prod.id);
      if (delErr) report.errors.push(`Delete product "${prod.name_ar}": ${delErr.message}`);
    }
  }

  report.deletedSubcategories.push({ id: subcategoryId, label });
  if (!DRY_RUN) {
    const { error: delErr } = await supabase.from('subcategories').delete().eq('id', subcategoryId);
    if (delErr) report.errors.push(`Delete subcategory "${label}": ${delErr.message}`);
  }
}

async function deleteCategoryTree(supabase, categoryId, report, label) {
  const subs = await fetchSubcategories(supabase, categoryId);
  for (const sub of subs) {
    await deleteProductsInSubcategory(supabase, sub.id, report, `${label} > ${sub.name_ar}`);
  }

  const products = await fetchCategoryProducts(supabase, categoryId);
  for (const prod of products) {
    report.deletedProducts.push({
      category: label,
      id: prod.id,
      name_ar: prod.name_ar,
      name_en: prod.name_en,
    });
    if (!DRY_RUN) {
      const { error } = await supabase.from('products').delete().eq('id', prod.id);
      if (error) report.errors.push(`Delete product "${prod.name_ar}": ${error.message}`);
    }
  }

  report.deletedCategories.push({ id: categoryId, label });
  if (!DRY_RUN) {
    const { error } = await supabase.from('categories').delete().eq('id', categoryId);
    if (error) report.errors.push(`Delete category "${label}": ${error.message}`);
  }
}

async function syncBeefCategory(supabase, report) {
  const category = await ensureCategory(supabase, BEEF_CATEGORY_AR, BEEF_CATEGORY_EN, {
    description_ar: 'برجر اللحم البقري',
    description_en: 'Beef burgers',
  });
  report.beefCategory = { created: category.created, id: category.id };

  const existing =
    DRY_RUN && category.created
      ? []
      : await fetchCategoryProducts(supabase, category.id);
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
      report.beefAdded.push({ ...target });
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
      report.beefUpdated.push({
        name_ar: target.name_ar,
        previous: {
          name_ar: match.name_ar,
          name_en: match.name_en,
          dining_price: match.dining_price,
          takeaway_price: match.takeaway_price,
        },
        current: target,
      });
      if (!DRY_RUN) {
        const updatePayload = { ...payload };
        if (match.description_ar?.trim()) delete updatePayload.description_ar;
        if (match.description_en?.trim()) delete updatePayload.description_en;
        const { error } = await supabase.from('products').update(updatePayload).eq('id', match.id);
        if (error) report.errors.push(`Update "${target.name_ar}": ${error.message}`);
      }
    } else {
      report.beefUnchanged.push({ name_ar: target.name_ar });
    }
  }

  for (const prod of existing) {
    if (!targetKeys.has(productKey(prod.name_ar))) {
      report.beefDeleted.push({
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

  report.beefFinal = DRY_RUN
    ? TARGET_PRODUCTS
    : (await fetchCategoryProducts(supabase, category.id)).map((p) => ({
        name_ar: p.name_ar,
        name_en: p.name_en,
        dining_price: Number(p.dining_price),
        takeaway_price: Number(p.takeaway_price),
      }));
}

async function removeSandwichesCategory(supabase, report) {
  const categories = await fetchCategoriesByName(supabase, SANDWICHES_CATEGORY_AR);
  if (!categories.length) {
    report.sandwichesRemoved = { found: false };
    return;
  }

  report.sandwichesRemoved = { found: true, count: categories.length };
  for (const cat of categories) {
    await deleteCategoryTree(supabase, cat.id, report, cat.name_ar);
  }
}

async function verify(supabase, report) {
  const beefCats = await fetchCategoriesByName(supabase, BEEF_CATEGORY_AR);
  const sandwichCats = await fetchCategoriesByName(supabase, SANDWICHES_CATEGORY_AR);

  report.verify = {
    beefCategoryExists: beefCats.length >= 1,
    beefProductCount: 0,
    sandwichesCategoryExists: sandwichCats.length > 0,
    otherCategories: [],
  };

  if (beefCats.length) {
    const products = await fetchCategoryProducts(supabase, beefCats[0].id);
    report.verify.beefProductCount = products.length;
    report.verify.beefProducts = products.map((p) => ({
      name_ar: p.name_ar,
      name_en: p.name_en,
      dining_price: Number(p.dining_price),
      takeaway_price: Number(p.takeaway_price),
    }));
  }

  const protectedNames = ['الكربيات', 'الوجبات', 'المشروبات', 'الإضافات'];
  const { data: allCats, error } = await supabase
    .from('categories')
    .select('id, name_ar, name_en')
    .in('name_ar', protectedNames);
  if (error) throw new Error(`Verify categories: ${error.message}`);

  for (const name of protectedNames) {
    const found = (allCats ?? []).filter((c) => c.name_ar === name);
    report.verify.otherCategories.push({ name_ar: name, count: found.length, exists: found.length > 0 });
  }
}

async function resolveEnv() {
  const local = loadEnv();
  const url = local.NEXT_PUBLIC_SUPABASE_URL;
  if (url?.includes(EXPECTED_PROJECT) && local.SUPABASE_SERVICE_ROLE_KEY) {
    return local;
  }
  console.log(`Local env targets another project; loading Doctor Burger credentials from Engaz admin.\n`);
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
    beefCategory: null,
    beefAdded: [],
    beefUpdated: [],
    beefDeleted: [],
    beefUnchanged: [],
    beefFinal: [],
    sandwichesRemoved: null,
    deletedProducts: [],
    deletedCategories: [],
    deletedSubcategories: [],
    errors: [],
    verify: null,
  };

  console.log(`=== Doctor Burger menu sync${DRY_RUN ? ' (DRY RUN)' : ''} ===\n`);

  await syncBeefCategory(supabase, report);
  await removeSandwichesCategory(supabase, report);
  if (!DRY_RUN) await verify(supabase, report);

  console.log('--- Task 1: بيف برجر ---');
  console.log(`Category: ${report.beefCategory.created ? 'created' : 'exists'} (${report.beefCategory.id})`);
  console.log(`Added: ${report.beefAdded.length}, Updated: ${report.beefUpdated.length}, Deleted: ${report.beefDeleted.length}, Unchanged: ${report.beefUnchanged.length}`);
  if (report.beefAdded.length) {
    for (const a of report.beefAdded) {
      console.log(`  + ${a.name_ar} | dine ${a.dining_price} | takeaway ${a.takeaway_price}`);
    }
  }
  if (report.beefUpdated.length) {
    for (const u of report.beefUpdated) {
      console.log(
        `  ~ ${u.name_ar} | dine ${u.current.dining_price} takeaway ${u.current.takeaway_price} (was dine ${u.previous.dining_price} takeaway ${u.previous.takeaway_price})`
      );
    }
  }
  if (report.beefDeleted.length) {
    for (const d of report.beefDeleted) {
      console.log(`  - ${d.name_ar} (${d.name_en})`);
    }
  }

  console.log('\n--- Task 2: الساندوتشات ---');
  if (!report.sandwichesRemoved?.found) {
    console.log('Category not found (already removed).');
  } else {
    console.log(`Deleted categories: ${report.deletedCategories.length}`);
    for (const c of report.deletedCategories) console.log(`  - ${c.label} (${c.id})`);
    console.log(`Deleted products: ${report.deletedProducts.length}`);
    for (const p of report.deletedProducts) console.log(`  - ${p.name_ar} (${p.name_en})`);
  }

  if (report.errors.length) {
    console.log('\n--- Errors ---');
    for (const e of report.errors) console.log(`  ! ${e}`);
  }

  if (report.verify) {
    console.log('\n--- Verify ---');
    console.log(`بيف برجر products: ${report.verify.beefProductCount}`);
    for (const p of report.verify.beefProducts ?? []) {
      console.log(`  ${p.name_ar} | ${p.name_en} | dine ${p.dining_price} | takeaway ${p.takeaway_price}`);
    }
    console.log(`الساندوتشات exists: ${report.verify.sandwichesCategoryExists}`);
    console.log('Other categories:');
    for (const c of report.verify.otherCategories) {
      console.log(`  ${c.name_ar}: ${c.exists ? 'OK' : 'MISSING'}`);
    }
  }

  const outPath = join(ROOT, 'scripts', 'last-beef-burger-sync-report.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nReport saved to scripts/last-beef-burger-sync-report.json`);

  if (!DRY_RUN) {
    if (report.verify.beefProductCount !== 3) {
      console.error(`\nVERIFY FAILED: expected 3 beef products, got ${report.verify.beefProductCount}`);
      process.exit(1);
    }
    if (report.verify.sandwichesCategoryExists) {
      console.error('\nVERIFY FAILED: الساندوتشات category still exists');
      process.exit(1);
    }
    if (report.errors.length) {
      console.error('\nVERIFY FAILED: errors occurred during sync');
      process.exit(1);
    }
    console.log('\nVERIFY OK');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
