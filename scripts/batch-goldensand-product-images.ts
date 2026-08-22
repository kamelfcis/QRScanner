#!/usr/bin/env node
/**
 * Batch AI product images for Golden Sand (products missing image_url).
 * Usage: npx tsx scripts/batch-goldensand-product-images.ts [--dry-run] [--limit N] [--product-id UUID] [--delay-ms 2000]
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { autoAssignProductImage } from '../src/lib/ai/product-image-auto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REPORT_PATH = join(__dirname, 'last-goldensand-ai-images-report.json');

type CliArgs = {
  dryRun: boolean;
  limit: number | null;
  productId: string | null;
  delayMs: number;
};

type ProductRow = {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  image_url: string | null;
  sort_order: number;
  category: {
    name_en: string;
    name_ar: string;
    name_fr: string | null;
    name_nl: string | null;
  } | null;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    dryRun: argv.includes('--dry-run'),
    limit: null,
    productId: null,
    delayMs: 2000,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--limit' && argv[i + 1]) {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n > 0) args.limit = Math.floor(n);
    } else if (arg === '--product-id' && argv[i + 1]) {
      args.productId = argv[++i]?.trim() || null;
    } else if (arg === '--delay-ms' && argv[i + 1]) {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n >= 0) args.delayMs = Math.floor(n);
    }
  }

  return args;
}

function loadLocalEnv() {
  for (const name of ['.env.local', '.env']) {
    const p = resolve(ROOT, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function categoryName(category: ProductRow['category']): string {
  if (!category) return '';
  return category.name_en?.trim() || category.name_ar?.trim() || '';
}

function normalizeCategory(
  category: ProductRow['category'] | ProductRow['category'][] | null | undefined
): ProductRow['category'] {
  if (!category) return null;
  if (Array.isArray(category)) return category[0] ?? null;
  return category;
}

function normalizeProduct(row: Record<string, unknown>): ProductRow {
  return {
    ...(row as Omit<ProductRow, 'category'>),
    category: normalizeCategory(
      row.category as ProductRow['category'] | ProductRow['category'][] | null
    ),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadLocalEnv();

  if (!process.env.GEMINI_API_KEY?.trim() && !args.dryRun) {
    throw new Error('GEMINI_API_KEY is required (set in .env.local or environment)');
  }

  const { getGoldenSandEnv } = await import('./_get-goldensand-env.mjs');
  const creds = await getGoldenSandEnv();

  const supabase = createClient(creds.NEXT_PUBLIC_SUPABASE_URL, creds.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let query = supabase
    .from('products')
    .select(
      'id, name_ar, name_en, description_ar, description_en, image_url, sort_order, category:categories(name_en, name_ar, name_fr, name_nl)'
    )
    .is('image_url', null)
    .order('sort_order', { ascending: true });

  if (args.productId) {
    query = query.eq('id', args.productId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load products: ${error.message}`);

  let products = (data ?? []).map((row) => normalizeProduct(row as Record<string, unknown>));
  if (args.limit !== null) {
    products = products.slice(0, args.limit);
  }

  const startedAt = new Date().toISOString();
  console.log(`Golden Sand batch AI images — ${products.length} product(s) without image_url`);

  if (args.dryRun) {
    for (const product of products) {
      console.log(`- ${product.name_en || product.name_ar} (${product.id})`);
    }
    const report = {
      startedAt,
      finishedAt: new Date().toISOString(),
      dryRun: true,
      totalCandidates: products.length,
      processed: 0,
      succeeded: 0,
      skipped: 0,
      failed: 0,
      results: products.map((product) => ({
        productId: product.id,
        name_en: product.name_en,
        name_ar: product.name_ar,
        status: 'dry_run',
      })),
    };
    writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(`Dry run complete. Report: ${REPORT_PATH}`);
    return;
  }

  const results: Array<Record<string, unknown>> = [];
  let succeeded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const label = product.name_en || product.name_ar;
    console.log(`[${i + 1}/${products.length}] ${label}`);

    try {
      const result = await autoAssignProductImage(
        supabase,
        product,
        categoryName(product.category)
      );
      if (result.skipped) {
        skipped++;
        results.push({
          productId: product.id,
          name_en: product.name_en,
          name_ar: product.name_ar,
          status: 'skipped',
          reason: result.reason,
        });
        console.log('  skipped (already has image)');
      } else {
        succeeded++;
        results.push({
          productId: product.id,
          name_en: product.name_en,
          name_ar: product.name_ar,
          status: 'success',
          image_url: result.imageUrl,
          pickedIndex: result.pickedIndex,
          scores: result.scores,
        });
        console.log(`  saved → picked candidate ${result.pickedIndex + 1}`);
      }
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        productId: product.id,
        name_en: product.name_en,
        name_ar: product.name_ar,
        status: 'failed',
        error: message,
      });
      console.error(`  failed: ${message}`);
    }

    if (i < products.length - 1 && args.delayMs > 0) {
      await sleep(args.delayMs);
    }
  }

  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    dryRun: false,
    totalCandidates: products.length,
    processed: products.length,
    succeeded,
    skipped,
    failed,
    delayMs: args.delayMs,
    results,
  };

  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`Done. succeeded=${succeeded} skipped=${skipped} failed=${failed}`);
  console.log(`Report: ${REPORT_PATH}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
