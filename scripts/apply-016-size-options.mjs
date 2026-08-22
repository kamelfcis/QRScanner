#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createDecipheriv } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGAZ_ROOT = resolve(ROOT, '../engaz-admin-wt');
const MIGRATION_PATH = resolve(ROOT, 'supabase/migrations/016_product_size_options.sql');

function loadEnv(root) {
  const env = {};
  for (const name of ['.env.local', '.env']) {
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
  const env = loadEnv(ENGAZ_ROOT);
  if (!env.ENGAZ_SECRETS_KEY) throw new Error('ENGAZ_SECRETS_KEY missing in engaz-admin-wt env');
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: doc, error: docErr } = await db
    .from('customers')
    .select('id')
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

  return decryptJson({ ...sec, authTag: sec.auth_tag }, env.ENGAZ_SECRETS_KEY);
}

async function runManagementSql(secrets, query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${secrets.supabaseProjectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secrets.supabaseAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`SQL failed (${res.status}): ${body.slice(0, 800)}`);
  }
  return body;
}

async function verifyColumn(secrets) {
  const client = createClient(secrets.supabaseUrl, secrets.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.from('products').select('id, has_size_options').limit(1);
  if (error) throw new Error(`Verify failed: ${error.message}`);
  const { count } = await client
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('has_size_options', true);
  return { sample: data?.[0] ?? null, sizeEnabledCount: count ?? 0 };
}

const secrets = await getDoctorBurgerSecrets();
if (secrets.supabaseProjectRef !== 'haiddzpusamlsstpxlcv') {
  throw new Error(`Unexpected project ref: ${secrets.supabaseProjectRef}`);
}

const sql = readFileSync(MIGRATION_PATH, 'utf8');
await runManagementSql(secrets, sql);
const verified = await verifyColumn(secrets);

console.log(
  JSON.stringify(
    {
      project: secrets.supabaseProjectRef,
      migration: '016_product_size_options.sql',
      status: 'applied',
      verified,
    },
    null,
    2
  )
);
