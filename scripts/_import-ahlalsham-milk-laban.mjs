#!/usr/bin/env node
/**
 * Import "منيو الحليب و اللبن" category + products from Excel into Ahl El Sham ONLY.
 * Idempotent: safe to re-run (upsert by category name + product name/price key).
 *
 * Usage:
 *   node scripts/_import-ahlalsham-milk-laban.mjs [--dry-run] [--file path/to/file.xlsx]
 */
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { createDecipheriv } from 'crypto';
import XLSX from 'xlsx';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGaz_ROOT = resolve(ROOT, '../engaz-admin-wt');
const CUSTOMER_ID = 'e8438bc2-e5e9-42a2-9eb0-6d48081740d0';
const EXPECTED_REF = 'qfwxghcshhvdozwpmlov';
const DEFAULT_XLSX = 'c:\\Users\\Administrator\\Downloads\\منيو\\منيو الحليب و اللبن.xlsx';

const CATEGORY_AR = 'منيو الحليب و اللبن';
const CATEGORY_EN = 'Milk & Dairy';

const DRY_RUN = process.argv.includes('--dry-run');
const fileArgIdx = process.argv.indexOf('--file');
const XLSX_PATH = fileArgIdx >= 0 ? process.argv[fileArgIdx + 1] : DEFAULT_XLSX;

function loadEnvFile(name, root = ROOT) {
  const env = {};
  const p = resolve(root, name);
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

function decryptJson({ ciphertext, iv, authTag }, keyB64) {
  const key = Buffer.from(keyB64, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]);
  return JSON.parse(plain.toString('utf8'));
}

async function resolveAhlalshamSupabase() {
  const engazEnv = { ...loadEnvFile('.env', ENGaz_ROOT), ...loadEnvFile('.env.local', ENGaz_ROOT) };
  if (!engazEnv.NEXT_PUBLIC_SUPABASE_URL || !engazEnv.SUPABASE_SERVICE_ROLE_KEY || !engazEnv.ENGAZ_SECRETS_KEY) {
    throw new Error('Missing Engaz admin env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ENGAZ_SECRETS_KEY)');
  }

  const admin = createClient(engazEnv.NEXT_PUBLIC_SUPABASE_URL, engazEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: customer, error: cErr } = await admin
    .from('customers')
    .select('id, slug')
    .eq('id', CUSTOMER_ID)
    .maybeSingle();
  if (cErr) throw new Error(`Customer fetch: ${cErr.message}`);
  if (!customer) throw new Error('Ahl El Sham customer not found');

  const { data: sec, error: secErr } = await admin
    .from('customer_secrets')
    .select('ciphertext, iv, auth_tag')
    .eq('customer_id', customer.id)
    .maybeSingle();
  if (secErr) throw new Error(`Secrets fetch: ${secErr.message}`);
  if (!sec) throw new Error('Ahl El Sham secrets not found');

  const secrets = decryptJson({ ...sec, authTag: sec.auth_tag }, engazEnv.ENGAZ_SECRETS_KEY);
  if (secrets.supabaseProjectRef !== EXPECTED_REF) {
    throw new Error(`Expected ref ${EXPECTED_REF}, got ${secrets.supabaseProjectRef}`);
  }
  if (!secrets.supabaseServiceRoleKey) {
    throw new Error('No supabaseServiceRoleKey in customer secrets');
  }

  const supabase = createClient(secrets.supabaseUrl, secrets.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return { supabase, customer, ref: secrets.supabaseProjectRef };
}

function normAr(s) {
  return (s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
}

function parsePrice(raw) {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const text = String(raw ?? '').trim().replace(/,/g, '');
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseExcelProducts(filePath) {
  if (!existsSync(filePath)) throw new Error(`Excel file not found: ${filePath}`);

  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });

  const raw = [];
  for (const row of rows) {
    const name = String(row[6] ?? '').trim();
    if (!name || name === 'الصنف') continue;
    const price = parsePrice(row[0]);
    if (price == null) continue;
    raw.push({ name_ar: name, price });
  }

  const seen = new Set();
  const products = [];
  for (const item of raw) {
    const key = `${normAr(item.name_ar)}|${item.price}`;
    if (seen.has(key)) continue;
    seen.add(key);
    products.push(item);
  }

  return { sheetName, products, rawCount: raw.length };
}

function productKey(nameAr, price) {
  return `${normAr(nameAr)}|${Number(price)}`;
}

async function fetchAllCategories(supabase) {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name_ar, sort_order')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`Categories fetch: ${error.message}`);
  return data ?? [];
}

async function fetchCategoryProducts(supabase, categoryId) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name_ar, dining_price, takeaway_price, sort_order, is_popular')
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`Products fetch: ${error.message}`);
  return data ?? [];
}

async function ensureCategory(supabase, categories) {
  const existing = categories.filter((c) => normAr(c.name_ar) === normAr(CATEGORY_AR));
  const maxSort = categories.reduce((m, c) => Math.max(m, c.sort_order ?? 0), -1);
  const sortOrder = existing.length ? existing[0].sort_order : maxSort + 1;

  const payload = {
    name_ar: CATEGORY_AR,
    name_en: CATEGORY_EN,
    description_ar: null,
    description_en: null,
    is_visible: true,
    sort_order: sortOrder,
  };

  if (existing.length) {
    const keeper = existing[0];
    if (!DRY_RUN) {
      const { error } = await supabase.from('categories').update(payload).eq('id', keeper.id);
      if (error) throw new Error(`Category update: ${error.message}`);
    }
    return { id: keeper.id, created: false, sort_order: sortOrder };
  }

  if (DRY_RUN) return { id: 'dry-run-category', created: true, sort_order: sortOrder };

  const { data, error } = await supabase.from('categories').insert(payload).select('id').single();
  if (error) throw new Error(`Category insert: ${error.message}`);
  return { id: data.id, created: true, sort_order: sortOrder };
}

async function upsertProducts(supabase, categoryId, products, report) {
  const existing =
    DRY_RUN && String(categoryId).startsWith('dry-run')
      ? []
      : await fetchCategoryProducts(supabase, categoryId);

  const existingByKey = new Map(existing.map((p) => [productKey(p.name_ar, p.dining_price), p]));

  for (let i = 0; i < products.length; i++) {
    const { name_ar, price } = products[i];
    const key = productKey(name_ar, price);
    const match = existingByKey.get(key);

    const payload = {
      category_id: categoryId,
      name_ar,
      name_en: name_ar,
      dining_price: price,
      takeaway_price: price,
      is_available: true,
      is_popular: false,
      sort_order: i,
    };

    if (!match) {
      report.inserted.push({ name_ar, price });
      if (!DRY_RUN) {
        const { error } = await supabase.from('products').insert(payload);
        if (error) report.errors.push(`Insert "${name_ar}": ${error.message}`);
      }
      continue;
    }

    const changed =
      Number(match.dining_price) !== price ||
      Number(match.takeaway_price) !== price ||
      match.sort_order !== i ||
      match.name_ar !== name_ar;

    if (changed) {
      report.updated.push({ name_ar, price });
      if (!DRY_RUN) {
        const { error } = await supabase.from('products').update(payload).eq('id', match.id);
        if (error) report.errors.push(`Update "${name_ar}": ${error.message}`);
      }
    } else {
      report.unchanged.push({ name_ar, price });
    }
  }
}

async function verifyImport(supabase, categoryId) {
  const { data: category, error: catErr } = await supabase
    .from('categories')
    .select('id, name_ar, name_en, sort_order, is_visible')
    .eq('id', categoryId)
    .single();
  if (catErr) throw new Error(`Verify category: ${catErr.message}`);

  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name_ar, dining_price, takeaway_price, is_available, sort_order')
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: true });
  if (prodErr) throw new Error(`Verify products: ${prodErr.message}`);

  return { category, products: products ?? [] };
}

async function main() {
  console.log(`Excel: ${XLSX_PATH}`);
  console.log(`Target: Ahl El Sham (${EXPECTED_REF})`);
  if (DRY_RUN) console.log('DRY RUN — no database writes\n');

  const parsed = parseExcelProducts(XLSX_PATH);
  console.log(`Parsed ${parsed.products.length} unique products (${parsed.rawCount} rows with price) from sheet "${parsed.sheetName}"`);

  const { supabase, customer, ref } = await resolveAhlalshamSupabase();
  console.log(`Connected: customer=${customer.slug}, ref=${ref}\n`);

  const categories = await fetchAllCategories(supabase);
  const category = await ensureCategory(supabase, categories);
  console.log(`Category "${CATEGORY_AR}": id=${category.id}, created=${category.created}, sort_order=${category.sort_order}`);

  const report = { inserted: [], updated: [], unchanged: [], errors: [] };
  await upsertProducts(supabase, category.id, parsed.products, report);

  let verification = null;
  if (!DRY_RUN && !String(category.id).startsWith('dry-run')) {
    verification = await verifyImport(supabase, category.id);
  }

  const summary = {
    tenant: 'ahlalsham',
    supabase_ref: ref,
    customer_id: CUSTOMER_ID,
    category: {
      id: category.id,
      name_ar: CATEGORY_AR,
      name_en: CATEGORY_EN,
      created: category.created,
      sort_order: category.sort_order,
    },
    excel: {
      file: XLSX_PATH,
      sheet: parsed.sheetName,
      parsed_rows: parsed.rawCount,
      unique_products: parsed.products.length,
    },
    products: {
      inserted: report.inserted.length,
      updated: report.updated.length,
      unchanged: report.unchanged.length,
      errors: report.errors.length,
    },
    sample_products: (verification?.products ?? parsed.products.slice(0, 5)).slice(0, 8).map((p) => ({
      name_ar: p.name_ar,
      dining_price: p.dining_price ?? p.price,
      takeaway_price: p.takeaway_price ?? p.price,
    })),
    errors: report.errors,
    dry_run: DRY_RUN,
    verified_product_count: verification?.products?.length ?? null,
  };

  const reportPath = join(ROOT, 'scripts', 'last-ahlalsham-milk-laban-import-report.json');
  writeFileSync(reportPath, JSON.stringify(summary, null, 2));

  console.log('\n--- Import summary ---');
  console.log(JSON.stringify(summary, null, 2));

  if (report.errors.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
