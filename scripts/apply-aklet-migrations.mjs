#!/usr/bin/env node
import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const EXPECTED_REF = 'hcgiqolzmuxaraaxozmk';
const MIGRATION_FILE = '018_multilingual_menu.sql';

function loadEnv(root, names) {
  const env = {};
  for (const name of names) {
    const p = resolve(root, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      let val = t.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      env[t.slice(0, i).trim()] = val;
    }
  }
  return env;
}

function getAkletRuntimeCreds() {
  const env = loadEnv(ROOT, ['.env', '.env.local', '.env.aklet.dev.tmp']);
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !url.includes(EXPECTED_REF)) {
    throw new Error('Missing Aklet runtime creds in .env.aklet.dev.tmp');
  }
  return { supabaseUrl: url, supabaseServiceRoleKey: key };
}

function buildConnectionCandidates(password) {
  const enc = encodeURIComponent(password);
  const regions = [
    'eu-central-1',
    'eu-north-1',
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'ap-southeast-1',
    'ap-northeast-1',
    'ap-south-1',
    'sa-east-1',
    'me-central-1',
  ];
  const out = [
    `postgresql://postgres:${enc}@db.${EXPECTED_REF}.supabase.co:5432/postgres`,
    `postgresql://postgres:${enc}@[2a05:d018:5b7:f201:f77e:bf24:b41f:526d]:5432/postgres`,
  ];
  for (const prefix of ['aws-0', 'aws-1']) {
    for (const region of regions) {
      out.push(
        `postgresql://postgres.${EXPECTED_REF}:${enc}@${prefix}-${region}.pooler.supabase.com:6543/postgres`
      );
      out.push(
        `postgresql://postgres.${EXPECTED_REF}:${enc}@${prefix}-${region}.pooler.supabase.com:5432/postgres`
      );
    }
  }
  return out;
}

async function connectAndApply(password) {
  const sql = readFileSync(join(ROOT, 'supabase/migrations', MIGRATION_FILE), 'utf8');
  const attempts = [];

  for (const connectionString of buildConnectionCandidates(password)) {
    const label = connectionString.replace(/:[^:@/]+@/, ':***@');
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      await client.query(sql);
      await client.end();
      return { ok: true, host: label };
    } catch (err) {
      attempts.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }

  throw new Error(`All Postgres connection attempts failed:\n${attempts.join('\n')}`);
}

async function verifyQueries(runtimeCreds) {
  const db = createClient(runtimeCreds.supabaseUrl, runtimeCreds.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const catalogSelect = `
    id, name_ar, name_en, name_fr, name_nl,
    subcategories:subcategories!category_id(id, name_fr, name_nl)
  `;

  const { data: categories, error: catErr } = await db
    .from('categories')
    .select(catalogSelect)
    .eq('is_visible', true)
    .limit(2);

  if (catErr) throw new Error(`categories verify: ${catErr.message}`);

  const { error: prodErr } = await db.from('products').select('name_fr, name_nl').limit(1);
  if (prodErr) throw new Error(`products verify: ${prodErr.message}`);

  return { categoryCount: categories?.length ?? 0 };
}

async function main() {
  const password = process.env.AKLET_DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    throw new Error('Set AKLET_DB_PASSWORD env var with Aklet Supabase database password');
  }

  const runtimeCreds = getAkletRuntimeCreds();
  console.log(`Applying ${MIGRATION_FILE} to ${EXPECTED_REF} via direct Postgres...`);

  const applied = await connectAndApply(password);
  console.log(`Applied via ${applied.host}`);

  const verified = await verifyQueries(runtimeCreds);
  console.log('Verified:', JSON.stringify(verified, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
