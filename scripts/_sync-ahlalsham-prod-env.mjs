#!/usr/bin/env node
/** Sync Ahl El Sham Supabase + branding env to all Vercel targets. */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { createDecipheriv } from 'crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGaz_ROOT = resolve(ROOT, '../engaz-admin-wt');
const PROJECT_ID = 'prj_VO3BtRd6fqsJTMuJo4W9ogq61uGs';
const TARGETS = ['production', 'preview', 'development'];
const CUSTOMER_ID = 'e8438bc2-e5e9-42a2-9eb0-6d48081740d0';
const EXPECTED_REF = 'qfwxghcshhvdozwpmlov';

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

async function resolveAhlalshamCreds() {
  const engazEnv = { ...loadEnvFile('.env', ENGaz_ROOT), ...loadEnvFile('.env.local', ENGaz_ROOT) };
  const admin = createClient(engazEnv.NEXT_PUBLIC_SUPABASE_URL, engazEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data: customer, error: cErr } = await admin
    .from('customers')
    .select('id, slug')
    .eq('id', CUSTOMER_ID)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!customer) throw new Error('Ahlalsham customer not found');

  const { data: sec, error: secErr } = await admin
    .from('customer_secrets')
    .select('ciphertext, iv, auth_tag')
    .eq('customer_id', customer.id)
    .maybeSingle();
  if (secErr) throw secErr;
  if (!sec) throw new Error('Ahlalsham secrets not found');

  const secrets = decryptJson({ ...sec, authTag: sec.auth_tag }, engazEnv.ENGAZ_SECRETS_KEY);
  if (secrets.supabaseProjectRef !== EXPECTED_REF) {
    throw new Error(`Expected ref ${EXPECTED_REF}, got ${secrets.supabaseProjectRef}`);
  }
  return {
    url: secrets.supabaseUrl,
    anonKey: secrets.supabaseAnonKey,
    serviceKey: secrets.supabaseServiceRoleKey,
    ref: secrets.supabaseProjectRef,
  };
}

const local = { ...loadEnvFile('.env'), ...loadEnvFile('.env.local') };
const token = local.VERCEL_TOKEN;
if (!token) {
  console.error('no VERCEL_TOKEN');
  process.exit(1);
}

const creds = await resolveAhlalshamCreds();
console.log('Ahlalsham Supabase ref:', creds.ref);

const desired = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', value: creds.url, type: 'plain' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: creds.anonKey, type: 'encrypted' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', value: creds.serviceKey, type: 'encrypted' },
  { key: 'NEXT_PUBLIC_TENANT', value: 'custom', type: 'plain' },
  { key: 'NEXT_PUBLIC_DEFAULT_LOCALE', value: 'ar', type: 'plain' },
  { key: 'NEXT_PUBLIC_ENABLED_LOCALES', value: 'ar,en', type: 'plain' },
  { key: 'NEXT_PUBLIC_APP_NAME', value: 'Ahl El Sham Spices', type: 'plain' },
  { key: 'NEXT_PUBLIC_APP_NAME_AR', value: 'عطارة اهل الشام', type: 'plain' },
  { key: 'NEXT_PUBLIC_HIDE_FEATURED_DISHES', value: 'false', type: 'plain' },
  { key: 'NEXT_PUBLIC_HIDE_LANDING_GALLERY', value: 'true', type: 'plain' },
  { key: 'NEXT_PUBLIC_FEATURED_COPY', value: 'items', type: 'plain' },
];

const listRes = await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env?decrypt=true`, {
  headers: { Authorization: `Bearer ${token}` },
});
const envs = (await listRes.json()).envs ?? [];

async function del(id, key) {
  const res = await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`deleted ${key} ${id}:`, res.ok ? 'ok' : await res.text());
}

async function create(key, value, type) {
  const res = await fetch(`https://api.vercel.com/v10/projects/${PROJECT_ID}/env`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value, type, target: TARGETS }),
  });
  const json = await res.json();
  console.log(`created ${key}:`, res.ok ? 'ok' : json);
}

async function upsert(item) {
  const rows = envs.filter((e) => e.key === item.key);
  const badRows = rows.filter((row) => {
    const empty = !row.value || row.value.trim() === '' || row.value === '[SENSITIVE]';
    const devOnly = (row.target ?? []).length === 1 && (row.target ?? [])[0] === 'development';
    const prodOnly = (row.target ?? []).length === 1 && (row.target ?? [])[0] === 'production';
    return empty || devOnly || (prodOnly && TARGETS.length > 1);
  });

  for (const row of badRows) {
    await del(row.id, item.key);
  }

  const goodRows = rows.filter((row) => !badRows.some((b) => b.id === row.id));
  if (goodRows.length === 0) {
    await create(item.key, item.value, item.type);
    return;
  }

  for (const row of goodRows) {
    const patchRes = await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${row.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: item.value, target: TARGETS, type: item.type }),
    });
    const patchJson = await patchRes.json();
    console.log(`updated ${item.key}:`, patchRes.ok ? 'ok' : patchJson);
  }
}

for (const item of desired) {
  await upsert(item);
}

console.log('Ahlalsham env sync complete.');
