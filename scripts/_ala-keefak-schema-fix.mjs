#!/usr/bin/env node
/**
 * Verify / apply missing catalog columns on ala-keefak Supabase (pytmkruoyyhxfktnkpuu).
 */
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

const env = { ...loadEnv('.env'), ...loadEnv('.env.local') };
const token = env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN is required in .env.local');
  process.exit(1);
}
const ref = 'pytmkruoyyhxfktnkpuu';
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || `https://${ref}.supabase.co`;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${text}`);
  return JSON.parse(text);
}

const PRODUCT_COLS = [
  'has_size_options',
  'name_fr',
  'name_nl',
  'description_fr',
  'description_nl',
  'price_per_kg',
  'weight_options_g',
];
const LOCALE_COLS = ['name_fr', 'name_nl', 'description_fr', 'description_nl'];

async function getColumns(table) {
  const rows = await sql(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = '${table}'
    ORDER BY column_name;
  `);
  return new Set(rows.map((r) => r.column_name));
}

async function verify() {
  const products = await getColumns('products');
  const categories = await getColumns('categories');
  const subcategories = await getColumns('subcategories');

  const missing = {
    products: PRODUCT_COLS.filter((c) => !products.has(c)),
    categories: LOCALE_COLS.filter((c) => !categories.has(c)),
    subcategories: LOCALE_COLS.filter((c) => !subcategories.has(c)),
  };

  let rest = {};
  if (anonKey) {
    const popularSelect =
      'id,category_id,subcategory_id,name_ar,name_en,description_ar,description_en,image_url,dining_price,takeaway_price,has_size_options,price_per_kg,weight_options_g,is_available,is_popular,is_new,is_bestseller,is_spicy,sort_order,created_at,updated_at';
    const catSelect =
      'id,name_ar,name_en,description_ar,description_en,image_url,banner_url,sort_order,is_visible';
    const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
    const [productsRes, categoriesRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/products?select=${encodeURIComponent(popularSelect)}&is_popular=eq.true&limit=1`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/categories?select=${encodeURIComponent(catSelect)}&is_visible=eq.true&limit=1`, { headers }),
    ]);
    rest = {
      products: { status: productsRes.status, ok: productsRes.ok },
      categories: { status: categoriesRes.status, ok: categoriesRes.ok },
    };
  }

  return { missing, rest };
}

async function apply() {
  const before = await verify();

  if (before.missing.products.includes('has_size_options')) {
    await sql(`
      ALTER TABLE public.products
        ADD COLUMN IF NOT EXISTS has_size_options BOOLEAN NOT NULL DEFAULT false;
    `);
  }

  for (const table of ['categories', 'subcategories', 'products']) {
    const cols = table === 'products' ? before.missing.products : before.missing[table];
    const localeMissing = cols.filter((c) => LOCALE_COLS.includes(c));
    if (localeMissing.length) {
      await sql(`
        ALTER TABLE public.${table}
          ADD COLUMN IF NOT EXISTS name_fr VARCHAR(255),
          ADD COLUMN IF NOT EXISTS name_nl VARCHAR(255),
          ADD COLUMN IF NOT EXISTS description_fr TEXT,
          ADD COLUMN IF NOT EXISTS description_nl TEXT;
      `);
    }
  }

  if (before.missing.products.includes('price_per_kg') || before.missing.products.includes('weight_options_g')) {
    await sql(`
      ALTER TABLE public.products
        ADD COLUMN IF NOT EXISTS price_per_kg NUMERIC,
        ADD COLUMN IF NOT EXISTS weight_options_g INTEGER[];
    `);
  }

  const after = await verify();
  return { before: before.missing, after: after.missing, rest: after.rest };
}

const mode = process.argv[2] || 'verify';
const fn = mode === 'apply' ? apply : verify;
fn()
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
