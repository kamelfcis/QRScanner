#!/usr/bin/env node
/**
 * DO NOT run for routine deploys. Doctor Burger production is ar/en only (Vercel: doctorburger).
 * Never: vercel deploy --project doctorburger from 4-locale / Golden Sand work.
 * Opt-in only: ALLOW_DOCTORBURGER_MIGRATIONS=1 node scripts/apply-doctorburger-migrations.mjs
 */
/**
/**
 * Apply migration 018 on Doctor Burger via Supabase Management API.
 * Usage: node scripts/apply-doctorburger-migrations.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { createDecipheriv } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ENGaz_ROOT = resolve(__dirname, '../../engaz-admin-wt');
const EXPECTED_REF = 'haiddzpusamlsstpxlcv';
const MANAGEMENT_API = 'https://api.supabase.com';

const MIGRATION_FILES = ['018_multilingual_menu.sql'];

function loadEnv(root) {
  const env = {};
  for (const name of ['.env.local', '.env']) {
    const p = resolve(root, name);
    try {
      const text = readFileSync(p, 'utf8');
      for (const line of text.split(/\r?\n/)) {
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
    } catch {
      /* missing file */
    }
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

async function getDoctorBurgerSecrets() {
  const env = loadEnv(ENGaz_ROOT);
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.ENGAZ_SECRETS_KEY) {
    throw new Error('Missing Engaz admin env vars');
  }

  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: doc, error: docErr } = await db
    .from('customers')
    .select('id, slug')
    .eq('slug', 'doctorburger')
    .maybeSingle();
  if (docErr) throw new Error(`Customer fetch: ${docErr.message}`);
  if (!doc) throw new Error('Doctor Burger customer not found');

  const { data: sec, error: secErr } = await db
    .from('customer_secrets')
    .select('ciphertext, iv, auth_tag')
    .eq('customer_id', doc.id)
    .maybeSingle();
  if (secErr) throw new Error(`Secrets fetch: ${secErr.message}`);
  if (!sec) throw new Error('Doctor Burger secrets not found');

  const secrets = decryptJson({ ...sec, authTag: sec.auth_tag }, env.ENGAZ_SECRETS_KEY);
  if (secrets.supabaseProjectRef !== EXPECTED_REF) {
    throw new Error(`Unexpected project ref: ${secrets.supabaseProjectRef}`);
  }
  return secrets;
}

function isAlreadyExistsError(message) {
  const text = message.toLowerCase();
  return text.includes('already exists') || text.includes('42701');
}

async function runSql(secrets, query, fileName) {
  const res = await fetch(
    `${MANAGEMENT_API}/v1/projects/${secrets.supabaseProjectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secrets.supabaseAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    const msg = `SQL failed (${res.status}) in ${fileName}: ${body.slice(0, 800)}`;
    if (isAlreadyExistsError(body)) {
      console.log(`  skip ${fileName} (already applied)`);
      return;
    }
    throw new Error(msg);
  }
}

async function verifyColumns(secrets) {
  const db = createClient(secrets.supabaseUrl, secrets.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: catErr } = await db
    .from('categories')
    .select('name_fr, name_nl, description_fr, description_nl')
    .limit(1);
  if (catErr) throw new Error(`categories verify: ${catErr.message}`);

  const { error: prodErr } = await db
    .from('products')
    .select('name_fr, name_nl, description_fr, description_nl')
    .limit(1);
  if (prodErr) throw new Error(`products verify: ${prodErr.message}`);

  console.log('  verified fr/nl columns on categories + products');
}

if (process.env.ALLOW_DOCTORBURGER_MIGRATIONS !== '1') {
  console.error('Blocked: set ALLOW_DOCTORBURGER_MIGRATIONS=1 to apply migrations on Doctor Burger.');
  process.exit(1);
}

async function main() {
  const secrets = await getDoctorBurgerSecrets();
  console.log(`Applying migrations to ${EXPECTED_REF}...\n`);

  for (const file of MIGRATION_FILES) {
    const sql = readFileSync(join(ROOT, 'supabase/migrations', file), 'utf8');
    console.log(`  applying ${file}...`);
    await runSql(secrets, sql, file);
    console.log(`  ok ${file}`);
  }

  await verifyColumns(secrets);
  console.log('\nMigrations applied.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});