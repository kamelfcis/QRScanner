#!/usr/bin/env node
/**
 * Full Golden Sand menu sync (16 categories, ~109 products).
 * Usage: node scripts/sync-goldensand-menu.mjs [--dry-run]
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { getGoldenSandEnv } from './_get-goldensand-env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');
const EXPECTED_PROJECT = 'worxtjqwmlusmttekawu';

const MENU = JSON.parse(readFileSync(join(__dirname, 'data/goldensand-menu.json'), 'utf8'));
const GLOSSARY = JSON.parse(readFileSync(join(__dirname, 'i18n/food-glossary.json'), 'utf8'));

const PHRASE_KEYS = Object.keys(GLOSSARY.phrases ?? {}).sort((a, b) => b.length - a.length);
const FRAGMENT_KEYS = Object.keys(GLOSSARY.fragments ?? {}).sort((a, b) => b.length - a.length);

function loadEnvFile(path) {
  if (!existsSync(path)) return null;
  const env = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
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

function translateExact(text) {
  const key = text?.trim();
  if (!key) return null;
  if (GLOSSARY.phrases?.[key]) return GLOSSARY.phrases[key];
  return null;
}

function translateByFragments(text, locale) {
  let remaining = text.trim();
  const parts = [];

  while (remaining.length > 0) {
    let matched = false;
    for (const arKey of FRAGMENT_KEYS) {
      if (remaining.startsWith(arKey)) {
        parts.push(GLOSSARY.fragments[arKey][locale] ?? arKey);
        remaining = remaining.slice(arKey.length).trim();
        matched = true;
        break;
      }
    }
    if (!matched) {
      parts.push(remaining);
      break;
    }
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function translateText(text) {
  const exact = translateExact(text);
  if (exact) return exact;

  return {
    en: translateByFragments(text, 'en'),
    fr: translateByFragments(text, 'fr'),
    nl: translateByFragments(text, 'nl'),
  };
}

function localizedFields(text) {
  const t = translateText(text);
  return {
    name_en: t.en,
    name_fr: t.fr,
    name_nl: t.nl,
  };
}

function descriptionFields(text) {
  if (!text?.trim()) return {};
  const t = translateText(text);
  return {
    description_ar: text.trim(),
    description_en: t.en,
    description_fr: t.fr,
    description_nl: t.nl,
  };
}

function defaultProductDescriptions(product) {
  if (product.description_ar) {
    return descriptionFields(product.description_ar);
  }
  const name = localizedFields(product.name_ar);
  return {
    description_ar: product.name_ar,
    description_en: name.name_en,
    description_fr: name.name_fr,
    description_nl: name.name_nl,
  };
}

async function resolveEnv() {
  const gsLocal = loadEnvFile(join(ROOT, '.env.goldensand.local'));
  if (
    gsLocal?.NEXT_PUBLIC_SUPABASE_URL?.includes(EXPECTED_PROJECT) &&
    gsLocal.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return gsLocal;
  }

  const local = loadEnvFile(join(ROOT, '.env.local'));
  if (
    local?.NEXT_PUBLIC_SUPABASE_URL?.includes(EXPECTED_PROJECT) &&
    local.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return local;
  }

  console.log('Local env targets another project; loading Golden Sand credentials from Engaz admin.\n');
  return getGoldenSandEnv();
}

async function fetchAllCategories(supabase) {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name_ar, name_en, sort_order')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`Categories fetch: ${error.message}`);
  return data ?? [];
}

async function fetchCategoryProducts(supabase, categoryId) {
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, name_ar, name_en, name_fr, name_nl, description_ar, description_en, description_fr, description_nl, dining_price, takeaway_price, sort_order'
    )
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`Products fetch: ${error.message}`);
  return data ?? [];
}

async function ensureCategory(supabase, category, sortOrder) {
  const names = localizedFields(category.name_ar);
  const desc = category.description_ar
    ? descriptionFields(category.description_ar)
    : {
        description_ar: null,
        description_en: null,
        description_fr: null,
        description_nl: null,
      };

  const { data: existing, error } = await supabase
    .from('categories')
    .select('id, name_ar')
    .eq('name_ar', category.name_ar);
  if (error) throw new Error(`Category fetch "${category.name_ar}": ${error.message}`);

  const payload = {
    name_ar: category.name_ar,
    ...names,
    ...desc,
    is_visible: true,
    sort_order: sortOrder,
  };

  if (existing?.length) {
    const keeper = existing[0];
    if (existing.length > 1 && !DRY_RUN) {
      for (const dup of existing.slice(1)) {
        await supabase.from('products').update({ category_id: keeper.id }).eq('category_id', dup.id);
        await supabase.from('categories').delete().eq('id', dup.id);
      }
    }
    if (!DRY_RUN) {
      const { error: updErr } = await supabase.from('categories').update(payload).eq('id', keeper.id);
      if (updErr) throw new Error(`Category update "${category.name_ar}": ${updErr.message}`);
    }
    return { id: keeper.id, created: false };
  }

  if (DRY_RUN) return { id: `dry-run-${sortOrder}`, created: true };

  const { data, error: insertErr } = await supabase
    .from('categories')
    .insert(payload)
    .select('id')
    .single();
  if (insertErr) throw new Error(`Category create "${category.name_ar}": ${insertErr.message}`);
  return { id: data.id, created: true };
}

async function syncProducts(supabase, categoryId, products, report) {
  const existing =
    DRY_RUN && String(categoryId).startsWith('dry-run')
      ? []
      : await fetchCategoryProducts(supabase, categoryId);
  const existingByKey = new Map(existing.map((p) => [productKey(p.name_ar), p]));
  const targetKeys = new Set(products.map((p) => productKey(p.name_ar)));

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const key = productKey(product.name_ar);
    const match = existingByKey.get(key);
    const names = localizedFields(product.name_ar);
    const desc = defaultProductDescriptions(product);
    const price = Number(product.price);

    const payload = {
      category_id: categoryId,
      name_ar: product.name_ar,
      ...names,
      ...desc,
      dining_price: price,
      takeaway_price: price,
      has_size_options: false,
      is_available: true,
      sort_order: i,
    };

    if (!match) {
      report.upserted.push({ action: 'insert', category_id: categoryId, name_ar: product.name_ar, price });
      if (!DRY_RUN) {
        const { error } = await supabase.from('products').insert(payload);
        if (error) report.errors.push(`Insert "${product.name_ar}": ${error.message}`);
      }
      continue;
    }

    const changed =
      Number(match.dining_price) !== price ||
      Number(match.takeaway_price) !== price ||
      match.name_en !== names.name_en ||
      match.name_fr !== names.name_fr ||
      match.name_nl !== names.name_nl ||
      match.sort_order !== i;

    if (changed) {
      report.upserted.push({ action: 'update', name_ar: product.name_ar, price });
      if (!DRY_RUN) {
        const { error } = await supabase.from('products').update(payload).eq('id', match.id);
        if (error) report.errors.push(`Update "${product.name_ar}": ${error.message}`);
      }
    } else {
      report.unchanged.push({ name_ar: product.name_ar });
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

async function removeOrphanCategories(supabase, keepNameArSet, report) {
  const all = DRY_RUN ? [] : await fetchAllCategories(supabase);
  for (const cat of all) {
    if (!keepNameArSet.has(cat.name_ar)) {
      const products = await fetchCategoryProducts(supabase, cat.id);
      for (const prod of products) {
        report.deleted.push({ id: prod.id, name_ar: prod.name_ar, orphanCategory: cat.name_ar });
        if (!DRY_RUN) {
          const { error } = await supabase.from('products').delete().eq('id', prod.id);
          if (error) report.errors.push(`Delete orphan product "${prod.name_ar}": ${error.message}`);
        }
      }
      report.deletedCategories.push({ id: cat.id, name_ar: cat.name_ar });
      if (!DRY_RUN) {
        const { error } = await supabase.from('categories').delete().eq('id', cat.id);
        if (error) report.errors.push(`Delete orphan category "${cat.name_ar}": ${error.message}`);
      }
    }
  }
}

async function ensureCurrency(supabase, report) {
  const { data, error } = await supabase
    .from('settings')
    .select('id, value')
    .eq('key', 'restaurant')
    .maybeSingle();
  if (error) throw new Error(`Settings fetch: ${error.message}`);

  const current = data?.value?.currency ?? null;
  report.currency = { before: current, expected: MENU.currency };

  if (current === MENU.currency) return;

  if (DRY_RUN) {
    report.currency.wouldUpdate = true;
    return;
  }

  const nextValue = { ...(data?.value ?? {}), currency: MENU.currency };
  const { error: updErr } = await supabase
    .from('settings')
    .update({ value: nextValue, updated_at: new Date().toISOString() })
    .eq('key', 'restaurant');
  if (updErr) report.errors.push(`Currency update: ${updErr.message}`);
  else report.currency.after = MENU.currency;
}

async function runOfflineDryRun() {
  const targetCategories = MENU.categories;
  const totalProducts = targetCategories.reduce((n, c) => n + c.products.length, 0);
  const report = {
    dryRun: true,
    offline: true,
    project: EXPECTED_PROJECT,
    categories: targetCategories.length,
    productsExpected: totalProducts,
    categoryResults: targetCategories.map((cat, i) => ({
      name_ar: cat.name_ar,
      productCount: cat.products.length,
      created: true,
      id: `dry-run-${i}`,
      ...localizedFields(cat.name_ar),
    })),
    sampleTranslations: targetCategories.slice(0, 3).flatMap((cat) =>
      cat.products.slice(0, 2).map((p) => ({
        name_ar: p.name_ar,
        ...localizedFields(p.name_ar),
      }))
    ),
    currency: { before: null, expected: MENU.currency, wouldUpdate: true },
    verify: {
      categoryCount: targetCategories.length,
      productCount: totalProducts,
      currency: MENU.currency,
      simulated: true,
    },
    upserted: [],
    unchanged: [],
    deleted: [],
    deletedCategories: [],
    errors: [],
  };

  console.log('=== Golden Sand menu sync (OFFLINE DRY RUN) ===');
  console.log(`Categories: ${targetCategories.length}, Products: ${totalProducts}\n`);
  for (let i = 0; i < targetCategories.length; i++) {
    const cat = targetCategories[i];
    console.log(
      `  [${i + 1}/${targetCategories.length}] ${cat.name_ar} — ${cat.products.length} products (simulated)`
    );
  }
  console.log('\n--- Sample translations ---');
  for (const s of report.sampleTranslations) {
    console.log(`  ${s.name_ar} → EN: ${s.name_en} | FR: ${s.name_fr} | NL: ${s.name_nl}`);
  }
  console.log('\n--- Summary ---');
  console.log(`Verify: ${report.verify.categoryCount} categories, ${report.verify.productCount} products`);
  console.log(`Currency target: ${MENU.currency}`);

  const outPath = join(ROOT, 'scripts', 'last-goldensand-sync-report.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nReport saved to scripts/last-goldensand-sync-report.json`);
  console.log('\nVERIFY OK (offline simulation)');
}

async function main() {
  if (DRY_RUN && process.argv.includes('--offline')) {
    await runOfflineDryRun();
    return;
  }

  let env;
  try {
    env = await Promise.race([
      resolveEnv(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Env resolution timed out after 15s')), 15000)
      ),
    ]);
  } catch (err) {
    if (DRY_RUN) {
      console.warn(`${err.message}\nFalling back to offline dry-run.\n`);
      await runOfflineDryRun();
      return;
    }
    throw err;
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase URL or service role key');
  if (!supabaseUrl.includes(EXPECTED_PROJECT)) {
    throw new Error(`Refusing: expected project ${EXPECTED_PROJECT}, got ${supabaseUrl}`);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const targetCategories = MENU.categories;
  const totalProducts = targetCategories.reduce((n, c) => n + c.products.length, 0);
  const keepNames = new Set(targetCategories.map((c) => c.name_ar));

  const report = {
    dryRun: DRY_RUN,
    project: EXPECTED_PROJECT,
    categories: targetCategories.length,
    productsExpected: totalProducts,
    categoryResults: [],
    upserted: [],
    unchanged: [],
    deleted: [],
    deletedCategories: [],
    errors: [],
    currency: null,
    verify: null,
  };

  console.log(`=== Golden Sand menu sync${DRY_RUN ? ' (DRY RUN)' : ''} ===`);
  console.log(`Categories: ${targetCategories.length}, Products: ${totalProducts}\n`);

  for (let i = 0; i < targetCategories.length; i++) {
    const cat = targetCategories[i];
    const catResult = { name_ar: cat.name_ar, productCount: cat.products.length, created: false, id: null };
    const ensured = await ensureCategory(supabase, cat, i);
    catResult.created = ensured.created;
    catResult.id = ensured.id;
    report.categoryResults.push(catResult);
    await syncProducts(supabase, ensured.id, cat.products, report);
    console.log(
      `  [${i + 1}/${targetCategories.length}] ${cat.name_ar} — ${cat.products.length} products${ensured.created ? ' (new)' : ''}`
    );
  }

  await removeOrphanCategories(supabase, keepNames, report);
  await ensureCurrency(supabase, report);

  if (!DRY_RUN) {
    const allCats = await fetchAllCategories(supabase);
    let productCount = 0;
    for (const cat of allCats) {
      const prods = await fetchCategoryProducts(supabase, cat.id);
      productCount += prods.length;
    }
    report.verify = {
      categoryCount: allCats.length,
      productCount,
      currency: report.currency?.after ?? report.currency?.before,
    };
  } else {
    report.verify = {
      categoryCount: targetCategories.length,
      productCount: totalProducts,
      currency: report.currency?.before ?? MENU.currency,
      simulated: true,
    };
  }

  console.log('\n--- Summary ---');
  console.log(`Upserted: ${report.upserted.length}`);
  console.log(`Unchanged: ${report.unchanged.length}`);
  console.log(`Deleted products: ${report.deleted.length}`);
  console.log(`Deleted categories: ${report.deletedCategories.length}`);
  console.log(`Currency: ${report.currency?.before ?? 'unknown'} → ${MENU.currency}`);
  console.log(
    `Verify: ${report.verify.categoryCount} categories, ${report.verify.productCount} products`
  );

  if (report.errors.length) {
    console.log('\nErrors:');
    for (const e of report.errors) console.log(`  ! ${e}`);
  }

  const outPath = join(ROOT, 'scripts', 'last-goldensand-sync-report.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nReport saved to scripts/last-goldensand-sync-report.json`);

  if (report.verify.categoryCount !== targetCategories.length) {
    console.error(`\nVERIFY FAILED: expected ${targetCategories.length} categories`);
    process.exit(1);
  }
  if (report.verify.productCount !== totalProducts) {
    console.error(`\nVERIFY FAILED: expected ${totalProducts} products, got ${report.verify.productCount}`);
    process.exit(1);
  }
  if (report.errors.length) {
    console.error('\nVERIFY FAILED: errors occurred during sync');
    process.exit(1);
  }

  console.log('\nVERIFY OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
