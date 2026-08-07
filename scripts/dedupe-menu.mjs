#!/usr/bin/env node
/**
 * Remove duplicate categories and products from Supabase.
 * Usage: node scripts/dedupe-menu.mjs [--dry-run]
 *
 * Categories: duplicate if same name_en OR name_ar (case-insensitive trim)
 * Products: duplicate if same name_en + category_id OR same name_ar + category_id
 * Keeps the oldest row (created_at, then id) in each duplicate group.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function norm(s) {
  return (s ?? '').trim().toLowerCase();
}

/** Union-find for grouping transitive duplicates */
class UnionFind {
  constructor(ids) {
    this.parent = new Map(ids.map((id) => [id, id]));
  }
  find(id) {
    let root = id;
    while (this.parent.get(root) !== root) root = this.parent.get(root);
    let cur = id;
    while (cur !== root) {
      const next = this.parent.get(cur);
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }
  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(rb, ra);
  }
  groups() {
    const map = new Map();
    for (const id of this.parent.keys()) {
      const root = this.find(id);
      if (!map.has(root)) map.set(root, []);
      map.get(root).push(id);
    }
    return [...map.values()].filter((g) => g.length > 1);
  }
}

function pickKeeper(rows) {
  return [...rows].sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  })[0];
}

async function getCounts(supabase) {
  const [cat, prod, sub, gal] = await Promise.all([
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('subcategories').select('*', { count: 'exact', head: true }),
    supabase.from('product_gallery').select('*', { count: 'exact', head: true }),
  ]);
  return {
    categories: cat.count ?? 0,
    products: prod.count ?? 0,
    subcategories: sub.count ?? 0,
    product_gallery: gal.count ?? 0,
  };
}

function findCategoryDuplicateGroups(categories) {
  const byNameEn = new Map();
  const byNameAr = new Map();
  for (const c of categories) {
    const en = norm(c.name_en);
    const ar = norm(c.name_ar);
    if (en) {
      if (!byNameEn.has(en)) byNameEn.set(en, []);
      byNameEn.get(en).push(c.id);
    }
    if (ar) {
      if (!byNameAr.has(ar)) byNameAr.set(ar, []);
      byNameAr.get(ar).push(c.id);
    }
  }
  const uf = new UnionFind(categories.map((c) => c.id));
  for (const ids of byNameEn.values()) {
    for (let i = 1; i < ids.length; i++) uf.union(ids[0], ids[i]);
  }
  for (const ids of byNameAr.values()) {
    for (let i = 1; i < ids.length; i++) uf.union(ids[0], ids[i]);
  }
  return uf.groups();
}

function findProductDuplicateGroups(products) {
  const byNameEn = new Map();
  const byNameAr = new Map();
  for (const p of products) {
    const enKey = `${p.category_id}::${norm(p.name_en)}`;
    const arKey = `${p.category_id}::${norm(p.name_ar)}`;
    if (norm(p.name_en)) {
      if (!byNameEn.has(enKey)) byNameEn.set(enKey, []);
      byNameEn.get(enKey).push(p.id);
    }
    if (norm(p.name_ar)) {
      if (!byNameAr.has(arKey)) byNameAr.set(arKey, []);
      byNameAr.get(arKey).push(p.id);
    }
  }
  const uf = new UnionFind(products.map((p) => p.id));
  for (const ids of byNameEn.values()) {
    for (let i = 1; i < ids.length; i++) uf.union(ids[0], ids[i]);
  }
  for (const ids of byNameAr.values()) {
    for (let i = 1; i < ids.length; i++) uf.union(ids[0], ids[i]);
  }
  return uf.groups();
}

async function fetchAll(supabase, table, select = '*') {
  const pageSize = 1000;
  let from = 0;
  const all = [];
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1)
      .order('created_at', { ascending: true });
    if (error) throw new Error(`${table} fetch: ${error.message}`);
    if (!data?.length) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function dedupeCategories(supabase, report) {
  const categories = await fetchAll(supabase, 'categories');
  const byId = new Map(categories.map((c) => [c.id, c]));
  const groups = findCategoryDuplicateGroups(categories);

  for (const groupIds of groups) {
    const rows = groupIds.map((id) => byId.get(id)).filter(Boolean);
    const keeper = pickKeeper(rows);
    const duplicates = rows.filter((r) => r.id !== keeper.id);

    report.categories.removed.push({
      kept: { id: keeper.id, name_en: keeper.name_en, name_ar: keeper.name_ar },
      removed: duplicates.map((d) => ({
        id: d.id,
        name_en: d.name_en,
        name_ar: d.name_ar,
        created_at: d.created_at,
      })),
    });

    for (const dup of duplicates) {
      if (DRY_RUN) continue;

      const { error: prodErr } = await supabase
        .from('products')
        .update({ category_id: keeper.id })
        .eq('category_id', dup.id);
      if (prodErr) report.errors.push(`products reassign ${dup.id}: ${prodErr.message}`);

      const { error: subErr } = await supabase
        .from('subcategories')
        .update({ category_id: keeper.id })
        .eq('category_id', dup.id);
      if (subErr) report.errors.push(`subcategories reassign ${dup.id}: ${subErr.message}`);

      const { error: searchErr } = await supabase
        .from('search_analytics')
        .update({ category_id: keeper.id })
        .eq('category_id', dup.id);
      if (searchErr && searchErr.code !== 'PGRST205') {
        report.errors.push(`search_analytics reassign ${dup.id}: ${searchErr.message}`);
      }

      const { error: delErr } = await supabase.from('categories').delete().eq('id', dup.id);
      if (delErr) report.errors.push(`delete category ${dup.id}: ${delErr.message}`);
    }
  }

  report.categories.groupsFound = groups.length;
  report.categories.rowsRemoved = groups.reduce((n, g) => n + g.length - 1, 0);
}

async function dedupeProducts(supabase, report) {
  const products = await fetchAll(supabase, 'products');
  const byId = new Map(products.map((p) => [p.id, p]));
  const groups = findProductDuplicateGroups(products);

  for (const groupIds of groups) {
    const rows = groupIds.map((id) => byId.get(id)).filter(Boolean);
    const keeper = pickKeeper(rows);
    const duplicates = rows.filter((r) => r.id !== keeper.id);

    report.products.removed.push({
      kept: {
        id: keeper.id,
        name_en: keeper.name_en,
        name_ar: keeper.name_ar,
        category_id: keeper.category_id,
      },
      removed: duplicates.map((d) => ({
        id: d.id,
        name_en: d.name_en,
        name_ar: d.name_ar,
        category_id: d.category_id,
        created_at: d.created_at,
      })),
    });

    for (const dup of duplicates) {
      if (DRY_RUN) continue;

      const { error: galErr } = await supabase
        .from('product_gallery')
        .update({ product_id: keeper.id })
        .eq('product_id', dup.id);
      if (galErr) report.errors.push(`product_gallery reassign ${dup.id}: ${galErr.message}`);

      const { error: delErr } = await supabase.from('products').delete().eq('id', dup.id);
      if (delErr) report.errors.push(`delete product ${dup.id}: ${delErr.message}`);
    }
  }

  report.products.groupsFound = groups.length;
  report.products.rowsRemoved = groups.reduce((n, g) => n + g.length - 1, 0);
}

async function main() {
  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase URL or service role key');

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`=== Warda Shamya Menu Dedupe${DRY_RUN ? ' (DRY RUN)' : ''} ===\n`);

  const before = await getCounts(supabase);
  console.log('--- Before ---');
  console.log(JSON.stringify(before, null, 2));

  const report = {
    dryRun: DRY_RUN,
    before,
    after: null,
    categories: { groupsFound: 0, rowsRemoved: 0, removed: [] },
    products: { groupsFound: 0, rowsRemoved: 0, removed: [] },
    errors: [],
  };

  console.log('\nDeduping categories...');
  await dedupeCategories(supabase, report);

  console.log('Deduping products...');
  await dedupeProducts(supabase, report);

  report.after = await getCounts(supabase);

  console.log('\n--- After ---');
  console.log(JSON.stringify(report.after, null, 2));

  console.log('\n--- Summary ---');
  console.log(
    `Categories: ${report.categories.groupsFound} duplicate groups, ${report.categories.rowsRemoved} rows removed`
  );
  console.log(
    `Products: ${report.products.groupsFound} duplicate groups, ${report.products.rowsRemoved} rows removed`
  );

  if (report.categories.removed.length) {
    console.log('\n--- Removed duplicate categories ---');
    for (const g of report.categories.removed) {
      console.log(`  Kept: "${g.kept.name_en}" / "${g.kept.name_ar}" (${g.kept.id})`);
      for (const r of g.removed) {
        console.log(`    Removed: "${r.name_en}" / "${r.name_ar}" (${r.id})`);
      }
    }
  }

  if (report.products.removed.length) {
    console.log('\n--- Removed duplicate products ---');
    for (const g of report.products.removed) {
      console.log(
        `  Kept: "${g.kept.name_en}" / "${g.kept.name_ar}" in category ${g.kept.category_id}`
      );
      for (const r of g.removed) {
        console.log(`    Removed: "${r.name_en}" / "${r.name_ar}" (${r.id})`);
      }
    }
  }

  if (report.errors.length) {
    console.log('\n--- Errors ---');
    for (const e of report.errors) console.log(`  ${e}`);
  }

  const outPath = join(ROOT, 'scripts', 'last-dedupe-report.json');
  const { writeFileSync } = await import('fs');
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nFull report saved to scripts/last-dedupe-report.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
