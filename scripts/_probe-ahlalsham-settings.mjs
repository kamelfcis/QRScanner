#!/usr/bin/env node
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
    console.warn(`Expected ref ${EXPECTED_REF}, got ${secrets.supabaseProjectRef}`);
  }
  return { customer, secrets };
}

const { customer, secrets } = await resolveAhlalshamClient();
console.log('Customer:', customer);
console.log('Supabase URL:', secrets.supabaseUrl);

const sb = createClient(secrets.supabaseUrl, secrets.supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

const { data: settings, error } = await sb.from('settings').select('value').eq('key', 'restaurant').single();
if (error) throw error;

const v = settings?.value ?? {};
const fields = [
  'name_en',
  'name_ar',
  'hero_image_url',
  'story_image_url',
  'logo_url',
  'story_title_en',
  'story_title_ar',
  'story_p1_en',
  'story_p1_ar',
  'story_p2_en',
  'story_p2_ar',
];
console.log('\nRESTAURANT SETTINGS:');
for (const f of fields) console.log(`${f}:`, v[f] ?? '(null)');

const anon = createClient(secrets.supabaseUrl, secrets.supabaseAnonKey);
const { data: anonData, error: anonErr } = await anon
  .from('settings')
  .select('value')
  .eq('key', 'restaurant')
  .single();
console.log('\nANON READ error:', anonErr?.message ?? 'none');
const av = anonData?.value ?? {};
console.log('anon name_ar:', av.name_ar);
console.log('anon story_p1_ar:', av.story_p1_ar?.slice(0, 100) ?? '(null)');
