#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { createDecipheriv } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(name) {
  const env = {};
  const p = resolve(ROOT, name);
  if (!existsSync(p)) return env;
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

async function getAkletCredsFromVercel(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key && url.includes('hcgiqolzmuxaraaxozmk')) {
    return {
      slug: 'aklet-gambary',
      url,
      key,
      ref: 'hcgiqolzmuxaraaxozmk',
    };
  }

  const projectId = 'prj_FNonretsEgvpkDj2BgVd35DYW7Aj';
  const token = env.VERCEL_TOKEN;
  if (!token) throw new Error('Missing VERCEL_TOKEN');

  const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env?decrypt=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Vercel env fetch failed: ${res.status}`);

  const json = await res.json();
  const pick = (key) => {
    const row = (json.envs ?? []).find(
      (e) => e.key === key && (e.target ?? []).includes('production')
    );
    return row?.value ?? null;
  };

  const pickedUrl = pick('NEXT_PUBLIC_SUPABASE_URL');
  const pickedKey = pick('SUPABASE_SERVICE_ROLE_KEY');
  if (!pickedUrl || !pickedKey) throw new Error('Missing Aklet Supabase env on Vercel production');

  const refMatch = pickedUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  return {
    slug: 'aklet-gambary',
    url: pickedUrl,
    key: pickedKey,
    ref: refMatch?.[1] ?? 'unknown',
  };
}

async function getAkletCreds(env) {
  try {
    return await getAkletCredsFromEngaz(env);
  } catch (engazErr) {
    console.warn(`Engaz secrets unavailable: ${engazErr instanceof Error ? engazErr.message : engazErr}`);
    return getAkletCredsFromVercel(env);
  }
}

async function getAkletCredsFromEngaz(env) {
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: customers, error: customerErr } = await admin
    .from('customers')
    .select('id, slug')
    .or('slug.eq.aklet-gambary,slug.eq.aklet,slug.ilike.%aklet%');

  if (customerErr) throw new Error(`Customer fetch: ${customerErr.message}`);
  const customer = customers?.[0];
  if (!customer) {
    const { data: all } = await admin.from('customers').select('id, slug').limit(20);
    throw new Error(`Aklet customer not found. Known slugs: ${(all ?? []).map((c) => c.slug).join(', ')}`);
  }

  const { data: sec, error: secErr } = await admin
    .from('customer_secrets')
    .select('ciphertext, iv, auth_tag')
    .eq('customer_id', customer.id)
    .maybeSingle();

  if (secErr) throw new Error(`Secrets fetch: ${secErr.message}`);
  if (!sec) throw new Error(`Aklet secrets not found for slug=${customer.slug} id=${customer.id}`);

  const secrets = decryptJson({ ...sec, authTag: sec.auth_tag }, env.ENGAZ_SECRETS_KEY);
  return {
    slug: customer.slug,
    url: secrets.supabaseUrl,
    key: secrets.supabaseServiceRoleKey,
    ref: secrets.supabaseProjectRef,
  };
}

async function patchOrderModes(creds) {
  const supabase = createClient(creds.url, creds.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: row, error: readErr } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'restaurant')
    .single();

  if (readErr) throw new Error(`Read settings: ${readErr.message}`);

  const current = (row?.value && typeof row.value === 'object' ? row.value : {}) ?? {};
  const updated = {
    ...current,
    enable_dine_in: false,
    enable_takeaway: true,
    enable_delivery: true,
  };

  const { error: updateErr } = await supabase
    .from('settings')
    .update({ value: updated, updated_at: new Date().toISOString() })
    .eq('key', 'restaurant');

  if (updateErr) throw new Error(`Update settings: ${updateErr.message}`);

  return {
    ref: creds.ref,
    slug: creds.slug,
    enable_dine_in: updated.enable_dine_in,
    enable_takeaway: updated.enable_takeaway,
    enable_delivery: updated.enable_delivery,
  };
}

const env = loadEnv();
if (!env.ENGAZ_SECRETS_KEY) {
  console.error('Missing ENGAZ_SECRETS_KEY in .env.local');
  process.exit(1);
}

try {
  const creds = await getAkletCreds(env);
  const result = await patchOrderModes(creds);
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
} catch (err) {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
}
