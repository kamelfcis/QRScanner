#!/usr/bin/env node
/** Patch Ahl El Sham restaurant settings: takeaway off, delivery on. */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { createDecipheriv } from 'crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGaz_ROOT = resolve(ROOT, '../engaz-admin-wt');
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

async function resolveAhlalshamClient() {
  const engazEnv = { ...loadEnvFile('.env', ENGaz_ROOT), ...loadEnvFile('.env.local', ENGaz_ROOT) };
  const admin = createClient(engazEnv.NEXT_PUBLIC_SUPABASE_URL, engazEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data: customer, error: cErr } = await admin
    .from('customers')
    .select('id, slug, display_name_ar, display_name_en')
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
  return { customer, secrets };
}

const { customer, secrets } = await resolveAhlalshamClient();
console.log('Customer:', customer.slug, customer.id);
console.log('Supabase URL:', secrets.supabaseUrl);
console.log('Project ref:', secrets.supabaseProjectRef);

const sb = createClient(secrets.supabaseUrl, secrets.supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

const { data: existing, error: readError } = await sb
  .from('settings')
  .select('value')
  .eq('key', 'restaurant')
  .single();
if (readError) throw readError;

const current = existing?.value && typeof existing.value === 'object' ? existing.value : {};
const updated = {
  ...current,
  enable_takeaway: false,
  enable_delivery: true,
};

const { data, error } = await sb
  .from('settings')
  .update({ value: updated, updated_at: new Date().toISOString() })
  .eq('key', 'restaurant')
  .select('value')
  .single();
if (error) throw error;

const v = data.value ?? {};
const result = {
  ok: true,
  ref: secrets.supabaseProjectRef,
  slug: customer.slug,
  before: {
    enable_dine_in: current.enable_dine_in,
    enable_takeaway: current.enable_takeaway,
    enable_delivery: current.enable_delivery,
  },
  after: {
    enable_dine_in: v.enable_dine_in,
    enable_takeaway: v.enable_takeaway,
    enable_delivery: v.enable_delivery,
  },
};
console.log(JSON.stringify(result, null, 2));
