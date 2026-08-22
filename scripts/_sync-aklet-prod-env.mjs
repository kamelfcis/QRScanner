#!/usr/bin/env node
/** Copy Aklet Supabase + branding env to all Vercel targets. */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { createDecipheriv } from 'crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGaz_ROOT = resolve(ROOT, '../engaz-admin-wt');
const AKLET_REF = 'hcgiqolzmuxaraaxozmk';

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
  return {
    ...loadEnvFile('.env'),
    ...loadEnvFile('.env.local'),
    ...loadEnvFile('.env.aklet.dev.tmp'),
  };
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

async function getAkletCredsFromEngaz(env) {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: customers, error: customerErr } = await admin
    .from('customers')
    .select('id, slug')
    .or('slug.eq.aklet-gambary,slug.eq.aklet,slug.ilike.%aklet%');
  if (customerErr) throw new Error(customerErr.message);
  const customer = customers?.[0];
  if (!customer) throw new Error('Aklet customer not found in Engaz');

  const { data: sec, error: secErr } = await admin
    .from('customer_secrets')
    .select('ciphertext, iv, auth_tag')
    .eq('customer_id', customer.id)
    .maybeSingle();
  if (secErr) throw new Error(secErr.message);
  if (!sec) throw new Error('Aklet secrets not found');

  const secrets = decryptJson({ ...sec, authTag: sec.auth_tag }, env.ENGAZ_SECRETS_KEY);
  return {
    url: secrets.supabaseUrl,
    anonKey: secrets.supabaseAnonKey,
    serviceKey: secrets.supabaseServiceRoleKey,
    ref: secrets.supabaseProjectRef,
  };
}

function getAkletCredsFromLocal(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url?.includes(AKLET_REF) || !anonKey || !serviceKey) {
    throw new Error('Missing Aklet creds in .env.aklet.dev.tmp');
  }
  return { url, anonKey, serviceKey, ref: AKLET_REF };
}

async function resolveAkletCreds() {
  const env = loadEnv();
  try {
    const engazEnv = { ...loadEnvFile('.env.local', ENGaz_ROOT), ...loadEnvFile('.env', ENGaz_ROOT) };
    if (engazEnv.ENGAZ_SECRETS_KEY && engazEnv.NEXT_PUBLIC_SUPABASE_URL && engazEnv.SUPABASE_SERVICE_ROLE_KEY) {
      return await getAkletCredsFromEngaz(engazEnv);
    }
  } catch (err) {
    console.warn('Engaz lookup failed:', err instanceof Error ? err.message : err);
  }
  return getAkletCredsFromLocal(env);
}

const creds = await resolveAkletCreds();
console.log('Aklet Supabase ref:', creds.ref);

const desired = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', value: creds.url, type: 'plain' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: creds.anonKey, type: 'encrypted' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', value: creds.serviceKey, type: 'encrypted' },
  { key: 'NEXT_PUBLIC_TENANT', value: 'aklet', type: 'plain' },
  { key: 'NEXT_PUBLIC_DEFAULT_LOCALE', value: 'ar', type: 'plain' },
  { key: 'NEXT_PUBLIC_ENABLED_LOCALES', value: 'ar,en', type: 'plain' },
  { key: 'NEXT_PUBLIC_APP_NAME', value: 'Aklet Gambary', type: 'plain' },
  { key: 'NEXT_PUBLIC_APP_NAME_AR', value: 'أكلة جمبري', type: 'plain' },
];

const env = loadEnv();
const token = env.VERCEL_TOKEN;
if (!token) {
  console.error('no VERCEL_TOKEN');
  process.exit(1);
}

const projectId = 'prj_FNonretsEgvpkDj2BgVd35DYW7Aj';
const targets = ['production', 'preview', 'development'];

const listRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, {
  headers: { Authorization: `Bearer ${token}` },
});
const json = await listRes.json();
const envs = json.envs ?? [];

async function upsert({ key, value, type }) {
  const matches = envs.filter((row) => row.key === key);
  if (matches.length === 0) {
    const createRes = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value, type, target: targets }),
    });
    const createJson = await createRes.json();
    console.log(`created ${key}:`, createRes.ok ? 'ok' : createJson);
    return;
  }

  for (const row of matches) {
    const patchRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${row.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value, target: targets, type }),
    });
    const patchJson = await patchRes.json();
    console.log(`updated ${key}:`, patchRes.ok ? 'ok' : patchJson);
  }
}

for (const item of desired) {
  await upsert(item);
}
