#!/usr/bin/env node
/**
 * Upload local product images for Ahl El Sham "قسم التجميل و الخميرة" category ONLY.
 * Idempotent: skips products that already have image_url (use --force to re-upload).
 *
 * Usage:
 *   node scripts/_upload-ahlalsham-beauty-yeast-images.mjs [--dry-run] [--force] [--dir path]
 */
import { readFileSync, existsSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join, extname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { createDecipheriv } from 'crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGaz_ROOT = resolve(ROOT, '../engaz-admin-wt');
const CUSTOMER_ID = 'e8438bc2-e5e9-42a2-9eb0-6d48081740d0';
const EXPECTED_REF = 'qfwxghcshhvdozwpmlov';
const CATEGORY_ID = '17fbf1d7-6c41-4f2d-86d5-1fb629856134';
const CATEGORY_AR = 'قسم التجميل و الخميرة';
const DEFAULT_IMAGE_DIR =
  'C:\\Users\\Administrator\\Downloads\\قسم_التجميل_والخميرة\\قسم التجميل و الخميرة';
const REPORT_PATH = join(ROOT, 'scripts', 'last-ahlalsham-beauty-yeast-images-report.json');
const PRODUCTS_BUCKET = 'products';

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const dirArgIdx = process.argv.indexOf('--dir');
const IMAGE_DIR = dirArgIdx >= 0 ? process.argv[dirArgIdx + 1] : DEFAULT_IMAGE_DIR;

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

  return { supabase, customer, ref: secrets.supabaseProjectRef, supabaseUrl: secrets.supabaseUrl };
}

function normAr(s) {
  return (s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
}

function normLatin(s) {
  return s.replace(/a\.?\s*m\.?\s*r\.?/gi, 'amr');
}

function stripExtension(filename) {
  return filename.replace(/\.(jpe?g|png|webp|gif)$/i, '');
}

function normKey(s) {
  return normLatin(normAr(s))
    .replace(/[()（）\[\]{}]/g, ' ')
    .replace(/[-،,./\\–—_+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normKeyStrict(s) {
  return normLatin(normAr(s))
    .replace(/[-،,./\\–—_+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normLoose(s) {
  return normKey(s)
    .replace(/\s/g, '')
    .replace(/gram|grams|جرام/gi, 'غ')
    .replace(/(\d)\s*غ/g, '$1غ')
    .replace(/(\d)\s*مل/g, '$1مل')
    .replace(/(\d)\s*ك/g, '$1ك')
    .replace(/(\d)\s*ل/g, '$1ل')
    .replace(/\.(?=\d)/g, '');
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], row[j], prev) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

function similarity(a, b) {
  const looseA = normLoose(a);
  const looseB = normLoose(b);
  if (!looseA || !looseB) return 0;
  if (looseA === looseB) return 1;
  if (looseA.includes(looseB) || looseB.includes(looseA)) {
    const shorter = Math.min(looseA.length, looseB.length);
    const longer = Math.max(looseA.length, looseB.length);
    return shorter / longer;
  }
  const dist = levenshtein(looseA, looseB);
  const maxLen = Math.max(looseA.length, looseB.length);
  return 1 - dist / maxLen;
}

function generateStoragePath(filename) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extMatch = filename.match(/\.(jpe?g|png|webp|gif)$/i);
  const ext = extMatch ? extMatch[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
  return `${timestamp}-${random}.${ext}`;
}

function listImageFiles(dir) {
  if (!existsSync(dir)) throw new Error(`Image folder not found: ${dir}`);
  const out = [];

  function walk(current) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      const ext = extname(entry.name).toLowerCase();
      if (!IMAGE_EXT.has(ext)) continue;
      out.push({
        path: full,
        name: entry.name,
        stem: stripExtension(entry.name),
        size: statSync(full).size,
      });
    }
  }

  walk(dir);
  return out.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

function scorePair(imageStem, product) {
  return Math.max(
    similarity(imageStem, product.name_ar),
    similarity(normKey(imageStem), normKey(product.name_ar))
  );
}

function matchImagesToProducts(images, products) {
  const usedProductIds = new Set();
  const usedImagePaths = new Set();
  const matched = [];

  const availableProducts = () => products.filter((p) => !usedProductIds.has(p.id));
  const availableImages = () => images.filter((i) => !usedImagePaths.has(i.path));

  function assign(image, product, score, method) {
    usedProductIds.add(product.id);
    usedImagePaths.add(image.path);
    matched.push({
      image,
      product,
      score: Number(score.toFixed(4)),
      method,
    });
  }

  // Pass 1: filename stem equals product name (normalized)
  for (const image of images) {
    const imageKey = normKey(image.stem);
    const hits = availableProducts().filter((p) => normKey(p.name_ar) === imageKey);
    if (hits.length === 1) {
      assign(image, hits[0], 1, 'exact_normKey');
      continue;
    }
    if (hits.length > 1) {
      const strictHits = hits.filter(
        (p) => normKeyStrict(image.stem) === normKeyStrict(p.name_ar)
      );
      if (strictHits.length === 1) {
        assign(image, strictHits[0], 1, 'exact_normKeyStrict');
        continue;
      }

      const ranked = hits
        .map((p) => ({ p, score: scorePair(image.stem, p) }))
        .sort((a, b) => b.score - a.score);
      if (ranked[0].score >= 0.98 && ranked[0].score - ranked[1].score > 0.005) {
        assign(image, ranked[0].p, ranked[0].score, 'exact_normKey_disambiguated');
      }
    }
  }

  // Pass 2: loose normalized equality (spacing / unit variants)
  for (const image of availableImages()) {
    const imageLoose = normLoose(image.stem);
    const hits = availableProducts().filter((p) => normLoose(p.name_ar) === imageLoose);
    if (hits.length === 1) assign(image, hits[0], 1, 'exact_normLoose');
  }

  // Pass 3: global greedy fuzzy matching on remaining pairs
  const pairs = [];
  for (const image of availableImages()) {
    for (const product of availableProducts()) {
      const score = scorePair(image.stem, product);
      if (score >= 0.88) pairs.push({ image, product, score });
    }
  }
  pairs.sort((a, b) => b.score - a.score || a.image.name.localeCompare(b.image.name, 'ar'));

  for (const { image, product, score } of pairs) {
    if (usedProductIds.has(product.id) || usedImagePaths.has(image.path)) continue;

    const rivals = pairs.filter(
      (p) =>
        p.image.path === image.path &&
        p.product.id !== product.id &&
        p.score >= score - 0.02 &&
        p.score >= 0.88
    );
    if (rivals.length > 0) continue;

    assign(image, product, score, 'fuzzy');
  }

  const unmatchedImages = availableImages().map((image) => {
    let best = null;
    let bestScore = 0;
    for (const product of availableProducts()) {
      const score = scorePair(image.stem, product);
      if (score > bestScore) {
        bestScore = score;
        best = product;
      }
    }
    return {
      file: image.name,
      path: image.path,
      best_candidate: best?.name_ar ?? null,
      best_score: best ? Number(bestScore.toFixed(4)) : null,
    };
  });

  const unmatchedProducts = products
    .filter((p) => !usedProductIds.has(p.id))
    .map((p) => ({ id: p.id, name_ar: p.name_ar, image_url: p.image_url }));

  return { matched, unmatchedImages, unmatchedProducts };
}

async function fetchCategoryProducts(supabase, categoryId) {
  const { data: category, error: catErr } = await supabase
    .from('categories')
    .select('id, name_ar')
    .eq('id', categoryId)
    .maybeSingle();
  if (catErr) throw new Error(`Category fetch: ${catErr.message}`);
  if (!category) throw new Error(`Category not found: ${categoryId}`);
  if (normAr(category.name_ar) !== normAr(CATEGORY_AR)) {
    throw new Error(`Category name mismatch: expected "${CATEGORY_AR}", got "${category.name_ar}"`);
  }

  const { data, error } = await supabase
    .from('products')
    .select('id, name_ar, image_url, sort_order')
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`Products fetch: ${error.message}`);
  return { category, products: data ?? [] };
}

async function uploadProductImage(supabase, localPath, filename) {
  const ext = extname(filename).toLowerCase();
  const contentType = MIME_BY_EXT[ext] ?? 'image/jpeg';
  const storagePath = generateStoragePath(filename);
  const body = readFileSync(localPath);

  const { data, error } = await supabase.storage.from(PRODUCTS_BUCKET).upload(storagePath, body, {
    contentType,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data: urlData } = supabase.storage.from(PRODUCTS_BUCKET).getPublicUrl(data.path);
  return { path: data.path, url: urlData.publicUrl };
}

async function main() {
  console.log(`Image dir: ${IMAGE_DIR}`);
  console.log(`Target: Ahl El Sham (${EXPECTED_REF}), category "${CATEGORY_AR}"`);
  if (DRY_RUN) console.log('DRY RUN — no storage/database writes\n');
  if (FORCE) console.log('FORCE — re-upload even when image_url is set\n');

  const images = listImageFiles(IMAGE_DIR);
  console.log(`Found ${images.length} image file(s)\n`);

  const { supabase, customer, ref } = await resolveAhlalshamSupabase();
  console.log(`Connected: customer=${customer.slug}, ref=${ref}\n`);

  const { category, products } = await fetchCategoryProducts(supabase, CATEGORY_ID);
  console.log(`Category id=${category.id}, products=${products.length}\n`);

  const { matched, unmatchedImages, unmatchedProducts } = matchImagesToProducts(images, products);
  console.log(`Matched ${matched.length} image(s) to product(s)`);
  console.log(`Unmatched images: ${unmatchedImages.length}, unmatched products: ${unmatchedProducts.length}\n`);

  const report = {
    matched: [],
    uploaded: [],
    skipped_unchanged: [],
    unmatched_images: unmatchedImages,
    unmatched_products: unmatchedProducts,
    errors: [],
  };

  for (const { image, product, score } of matched) {
    const entry = {
      file: image.name,
      product_id: product.id,
      name_ar: product.name_ar,
      score,
      previous_image_url: product.image_url,
    };

    if (product.image_url && !FORCE) {
      report.skipped_unchanged.push({ ...entry, image_url: product.image_url, reason: 'image_url_already_set' });
      continue;
    }

    try {
      if (DRY_RUN) {
        report.uploaded.push({ ...entry, image_url: '(dry-run)', storage_path: '(dry-run)' });
        continue;
      }

      const { path: storagePath, url } = await uploadProductImage(supabase, image.path, image.name);

      const { error: updErr } = await supabase
        .from('products')
        .update({ image_url: url })
        .eq('id', product.id)
        .eq('category_id', CATEGORY_ID);
      if (updErr) throw new Error(`DB update: ${updErr.message}`);

      report.uploaded.push({ ...entry, image_url: url, storage_path: storagePath });
    } catch (err) {
      report.errors.push({
        file: image.name,
        product_id: product.id,
        name_ar: product.name_ar,
        message: err?.message || String(err),
      });
    }
  }

  report.matched = matched.map(({ image, product, score, method }) => ({
    file: image.name,
    product_id: product.id,
    name_ar: product.name_ar,
    score,
    method,
    had_image_url: Boolean(product.image_url),
  }));

  const summary = {
    tenant: 'ahlalsham',
    supabase_ref: ref,
    customer_id: CUSTOMER_ID,
    category: {
      id: CATEGORY_ID,
      name_ar: CATEGORY_AR,
    },
    image_dir: IMAGE_DIR,
    counts: {
      images_found: images.length,
      products_in_category: products.length,
      matched: matched.length,
      uploaded: report.uploaded.length,
      skipped_unchanged: report.skipped_unchanged.length,
      unmatched_images: unmatchedImages.length,
      unmatched_products: unmatchedProducts.length,
      errors: report.errors.length,
    },
    sample_matched: report.matched.slice(0, 8),
    sample_uploaded: report.uploaded.slice(0, 8),
    sample_unmatched_images: unmatchedImages.slice(0, 10),
    sample_unmatched_products: unmatchedProducts.slice(0, 10),
    errors: report.errors,
    dry_run: DRY_RUN,
    force: FORCE,
    finished_at: new Date().toISOString(),
  };

  writeFileSync(REPORT_PATH, JSON.stringify({ ...summary, details: report }, null, 2));

  console.log('\n--- Upload summary ---');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nReport: ${REPORT_PATH}`);

  if (report.errors.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
