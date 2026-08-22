#!/usr/bin/env node
/**
 * Sync Doctor Burger "سندوتش سوري" and "المقبلات" categories to exact product lists.
 * Usage: node scripts/sync-syrian-appetizers-menu.mjs [--dry-run]
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

const CATEGORIES = [
  {
    name_ar: 'سندوتش سوري',
    name_en: 'Syrian Sandwich',
    description_ar: 'سندوتشات سورية ملفوف',
    description_en: 'Syrian malfoof wraps',
    expectedCount: 8,
    products: [
      {
        name_ar: 'ملفوف شاورما',
        name_en: 'Malfoof Shawarma',
        dining_price: 70,
        takeaway_price: 110,
      },
      {
        name_ar: 'ملفوف استريبس',
        name_en: 'Malfoof Strips',
        dining_price: 70,
        takeaway_price: 110,
      },
      {
        name_ar: 'ملفوف كفتة',
        name_en: 'Malfoof Kofta',
        dining_price: 65,
        takeaway_price: 100,
      },
      {
        name_ar: 'ملفوف سجق',
        name_en: 'Malfoof Sujuk',
        dining_price: 65,
        takeaway_price: 90,
      },
      {
        name_ar: 'ملفوف مكس',
        name_en: 'Malfoof Mix',
        dining_price: 80,
        takeaway_price: 120,
      },
      {
        name_ar: 'ملفوف بطاطس',
        name_en: 'Malfoof Potato',
        dining_price: 45,
        takeaway_price: 70,
      },
      {
        name_ar: 'ملفوف شيش طاووق',
        name_en: 'Malfoof Shish Tawook',
        dining_price: 80,
        takeaway_price: 120,
      },
      {
        name_ar: 'ملفوف سوسيس',
        name_en: 'Malfoof Sausage',
        dining_price: 70,
        takeaway_price: 90,
      },
    ],
    productDescription: (product) => ({
      description_ar: `${product.name_ar} — سندوتش سوري ملفوف من دكتور برجر.`,
      description_en: `${product.name_en} — Syrian malfoof wrap from Doctor Burger.`,
    }),
  },
  {
    name_ar: 'المقبلات',
    name_en: 'Appetizers',
    description_ar: 'مقبلات ومشهيات',
    description_en: 'Appetizers and sides',
    expectedCount: 2,
    products: [
      {
        name_ar: 'فرايز تشيكن',
        name_en: 'Chicken Fries',
        dining_price: 90,
        takeaway_price: 90,
      },
      {
        name_ar: 'شيدر فرايز',
        name_en: 'Cheddar Fries',
        dining_price: 50,
        takeaway_price: 50,
      },
    ],
    productDescription: (product) => ({
      description_ar: `${product.name_ar} — مقبلات لذيذة من دكتور برجر.`,
      description_en: `${product.name_en} — tasty appetizer from Doctor Burger.`,
    }),
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

async function ensureCategory(supabase, category) {
  const { data: existing, error } = await supabase
    .from('categories')
    .select('id, name_ar, name_en')
    .eq('name_ar', category.name_ar);
  if (error) throw new Error(`Category fetch "${category.name_ar}": ${error.message}`);

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
          name_en: category.name_en,
          description_ar: category.description_ar,
          description_en: category.description_en,
          is_visible: true,
        })
        .eq('id', keeper.id);
    }
    return { id: keeper.id, created: false };
  }

  if (DRY_RUN) return { id: `dry-run-${category.name_ar}`, created: true };

  const { data, error: insertErr } = await supabase
    .from('categories')
    .insert({
      name_ar: category.name_ar,
      name_en: category.name_en,
      description_ar: category.description_ar,
      description_en: category.description_en,
      is_visible: true,
      sort_order: 0,
    })
    .select('id')
    .single();
  if (insertErr) throw new Error(`Category create "${category.name_ar}": ${insertErr.message}`);
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

async function syncCategory(supabase, category, report) {
  const section = {
    name_ar: category.name_ar,
    category: null,
    upserted: [],
    deleted: [],
    unchanged: [],
    final: [],
  };

  const cat = await ensureCategory(supabase, category);
  section.category = { created: cat.created, id: cat.id };

  const existing =
    DRY_RUN && cat.created ? [] : await fetchCategoryProducts(supabase, cat.id);
  const existingByKey = new Map(existing.map((p) => [productKey(p.name_ar), p]));
  const targetKeys = new Set(category.products.map((p) => productKey(p.name_ar)));

  for (let i = 0; i < category.products.length; i++) {
    const target = category.products[i];
    const key = productKey(target.name_ar);
    const match = existingByKey.get(key);
    const desc = category.productDescription(target);

    const payload = {
      category_id: cat.id,
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
      section.upserted.push({ action: 'insert', ...target });
      if (!DRY_RUN) {
        const { error } = await supabase.from('products').insert(payload);
        if (error) report.errors.push(`Insert "${target.name_ar}": ${error.message}`);
      }
      continue;
    }

    const priceChanged =
      Number(match.dining_price) !== target.dining_price ||
      Number(match.takeaway_price) !== target.takeaway_price;
    const nameChanged = match.name_ar !== target.name_ar || !match.name_en?.trim();
    const descMissing = !match.description_ar?.trim() || !match.description_en?.trim();

    if (priceChanged || nameChanged || match.name_en !== target.name_en || match.sort_order !== i || descMissing) {
      section.upserted.push({
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
      section.unchanged.push({ name_ar: target.name_ar });
    }
  }

  for (const prod of existing) {
    if (!targetKeys.has(productKey(prod.name_ar))) {
      section.deleted.push({
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

  const finalProducts =
    DRY_RUN && cat.created ? category.products : await fetchCategoryProducts(supabase, cat.id);

  section.final = finalProducts.map((p) => ({
    name_ar: p.name_ar,
    name_en: p.name_en,
    dining_price: Number(p.dining_price),
    takeaway_price: Number(p.takeaway_price),
  }));

  return section;
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
    sections: [],
    errors: [],
    verify: {},
  };

  console.log(`=== Doctor Burger Syrian & Appetizers sync${DRY_RUN ? ' (DRY RUN)' : ''} ===\n`);

  for (const category of CATEGORIES) {
    console.log(`--- ${category.name_ar} (${category.name_en}) ---`);
    const section = await syncCategory(supabase, category, report);
    report.sections.push(section);

    console.log(
      `Category: ${section.category.created ? 'created' : 'exists'} (${section.category.id})`
    );
    console.log(
      `Upserted: ${section.upserted.length}, Deleted: ${section.deleted.length}, Unchanged: ${section.unchanged.length}, Final: ${section.final.length}`
    );

    for (const u of section.upserted) {
      console.log(
        `  ${u.action === 'insert' ? '+' : '~'} ${u.name_ar} | dine ${u.dining_price} | takeaway ${u.takeaway_price}`
      );
    }
    for (const d of section.deleted) {
      console.log(`  - ${d.name_ar} (${d.name_en ?? '—'})`);
    }

    report.verify[category.name_ar] = {
      expectedCount: category.expectedCount,
      actualCount: section.final.length,
      ok: section.final.length === category.expectedCount,
      products: section.final,
    };
    console.log('');
  }

  const outPath = join(ROOT, 'scripts', 'last-syrian-appetizers-sync-report.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Report saved to scripts/last-syrian-appetizers-sync-report.json`);

  if (report.errors.length) {
    console.log('\nErrors:');
    for (const e of report.errors) console.log(`  ! ${e}`);
  }

  console.log('\n--- Verify ---');
  let allOk = true;
  for (const category of CATEGORIES) {
    const v = report.verify[category.name_ar];
    const status = v.ok ? 'OK' : 'FAILED';
    console.log(`${category.name_ar}: ${v.actualCount}/${v.expectedCount} — ${status}`);
    if (!v.ok) allOk = false;
    for (const p of v.products) {
      console.log(
        `  ${p.name_ar} | ${p.name_en} | dine ${p.dining_price} | takeaway ${p.takeaway_price}`
      );
    }
  }

  if (!DRY_RUN && (!allOk || report.errors.length)) {
    console.error('\nVERIFY FAILED');
    process.exit(1);
  }
  if (!DRY_RUN) console.log('\nVERIFY OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
