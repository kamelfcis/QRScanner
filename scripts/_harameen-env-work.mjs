#!/usr/bin/env node
/** Harameen Vercel env audit/set + duplicate cleanup (Aklet pattern). */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { createDecipheriv } from 'crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGaz_ROOT = resolve(ROOT, '../engaz-admin-wt');
const TEAM_ID = 'team_2IFtuuXSEcZGzUhW1VNyM0JE';
const PROJECT_NAME = 'harameen';

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

function loadEnv() {
  return { ...loadEnvFile('.env'), ...loadEnvFile('.env.local') };
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

async function getHarameenCredsFromEngaz(env) {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: customers, error: customerErr } = await admin
    .from('customers')
    .select('id, slug')
    .or('slug.eq.harameen,slug.ilike.%harameen%');
  if (customerErr) throw new Error(customerErr.message);
  const customer = customers?.[0];
  if (!customer) throw new Error('Harameen customer not found in Engaz');

  const { data: sec, error: secErr } = await admin
    .from('customer_secrets')
    .select('ciphertext, iv, auth_tag')
    .eq('customer_id', customer.id)
    .maybeSingle();
  if (secErr) throw new Error(secErr.message);
  if (!sec) throw new Error('Harameen secrets not found');

  const secrets = decryptJson({ ...sec, authTag: sec.auth_tag }, env.ENGAZ_SECRETS_KEY);
  return {
    url: secrets.supabaseUrl,
    anonKey: secrets.supabaseAnonKey,
    serviceKey: secrets.supabaseServiceRoleKey,
    ref: secrets.supabaseProjectRef,
  };
}

async function resolveHarameenCreds() {
  const engazEnv = { ...loadEnvFile('.env.local', ENGaz_ROOT), ...loadEnvFile('.env', ENGaz_ROOT) };
  if (engazEnv.ENGAZ_SECRETS_KEY && engazEnv.NEXT_PUBLIC_SUPABASE_URL && engazEnv.SUPABASE_SERVICE_ROLE_KEY) {
    return await getHarameenCredsFromEngaz(engazEnv);
  }
  throw new Error('Missing Engaz admin env for Harameen cred lookup');
}

const mode = process.argv[2] ?? 'audit';
const env = loadEnv();
const token = env.VERCEL_TOKEN;
if (!token) {
  console.error('no VERCEL_TOKEN');
  process.exit(1);
}

const projectRes = await fetch(
  `https://api.vercel.com/v9/projects/${PROJECT_NAME}?teamId=${TEAM_ID}`,
  { headers: { Authorization: `Bearer ${token}` } }
);
const project = await projectRes.json();
if (!projectRes.ok) {
  console.error('project lookup failed:', project);
  process.exit(1);
}
const projectId = project.id;
console.log('Harameen project:', projectId);

const listRes = await fetch(
  `https://api.vercel.com/v9/projects/${projectId}/env?decrypt=true`,
  { headers: { Authorization: `Bearer ${token}` } }
);
const envs = (await listRes.json()).envs ?? [];

const keysToAudit = [
  'NEXT_PUBLIC_TENANT',
  'NEXT_PUBLIC_DEFAULT_LOCALE',
  'NEXT_PUBLIC_ENABLED_LOCALES',
  'NEXT_PUBLIC_APP_NAME',
  'NEXT_PUBLIC_APP_NAME_AR',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

console.log('\n=== Current env ===');
for (const key of keysToAudit) {
  const rows = envs.filter((e) => e.key === key);
  console.log(`\n${key} (${rows.length} rows)`);
  for (const row of rows) {
    const val = row.value ?? '';
    const preview = val.length > 50 ? `${val.slice(0, 24)}…(${val.length})` : val || '(empty)';
    console.log(`  id=${row.id} type=${row.type} targets=${(row.target ?? []).join(',')} value=${preview}`);
  }
}

if (mode === 'audit') {
  process.exit(0);
}

const creds = await resolveHarameenCreds();
console.log('\nHarameen Supabase ref:', creds.ref);

const targets = ['production', 'preview', 'development'];
const desired = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', value: creds.url, type: 'plain' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: creds.anonKey, type: 'encrypted' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', value: creds.serviceKey, type: 'encrypted' },
  { key: 'NEXT_PUBLIC_TENANT', value: 'harameen', type: 'plain' },
  { key: 'NEXT_PUBLIC_DEFAULT_LOCALE', value: 'ar', type: 'plain' },
  { key: 'NEXT_PUBLIC_ENABLED_LOCALES', value: 'ar,en', type: 'plain' },
  { key: 'NEXT_PUBLIC_APP_NAME', value: 'Harameen Wholesale Market', type: 'plain' },
  { key: 'NEXT_PUBLIC_APP_NAME_AR', value: 'سوق الجملة شركة الحرمين', type: 'plain' },
];

async function del(id, key) {
  const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`deleted ${key} ${id}:`, res.ok ? 'ok' : await res.text());
}

async function create(key, value, type) {
  const res = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value, type, target: targets }),
  });
  const json = await res.json();
  console.log(`created ${key}:`, res.ok ? 'ok' : json);
}

const keysToFix = keysToAudit;

for (const key of keysToFix) {
  const rows = envs.filter((e) => e.key === key);
  for (const row of rows) {
    const empty = !row.value || row.value.trim() === '';
    const devOnly = (row.target ?? []).length === 1 && (row.target ?? [])[0] === 'development';
    if (empty || devOnly) {
      await del(row.id, key);
    }
  }
}

for (const item of desired) {
  const rows = envs.filter((e) => e.key === item.key);
  const goodRows = rows.filter((row) => {
    const empty = !row.value || row.value.trim() === '';
    const devOnly = (row.target ?? []).length === 1 && (row.target ?? [])[0] === 'development';
    return !empty && !devOnly;
  });

  if (goodRows.length === 0) {
    await create(item.key, item.value, item.type);
    continue;
  }

  for (const row of goodRows) {
    const patchRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${row.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: item.value, target: targets, type: item.type }),
    });
    const patchJson = await patchRes.json();
    console.log(`updated ${item.key}:`, patchRes.ok ? 'ok' : patchJson);
  }
}

console.log('\nDone setting Harameen env.');
