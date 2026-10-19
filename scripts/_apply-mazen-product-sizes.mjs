#!/usr/bin/env node
/**
 * Apply 021_product_sizes.sql to Mazen Store Supabase (mokijxmoxfbahncsfpzb) only.
 * Requires SUPABASE_ACCESS_TOKEN in environment.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PROJECT_REF = 'mokijxmoxfbahncsfpzb';
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(here, '../supabase/migrations/021_product_sizes.sql'), 'utf8');

const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

const text = await response.text();
if (!response.ok) {
  console.error('Migration failed:', response.status, text);
  process.exit(1);
}

console.log('Migration applied on', PROJECT_REF);
console.log(text || 'OK');
