#!/usr/bin/env node
/** Patch Ahl El Sham restaurant settings: names + story copy. */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { createDecipheriv } from 'crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGaz_ROOT = resolve(ROOT, '../engaz-admin-wt');
const CUSTOMER_ID = 'e8438bc2-e5e9-42a2-9eb0-6d48081740d0';

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
  return createClient(secrets.supabaseUrl, secrets.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}

const patch = {
  name_en: 'Ahl El Sham Spices',
  name_ar: 'عطارة اهل الشام',
  story_title_en: 'Our Story',
  story_title_ar: 'قصتنا',
  story_p1_en:
    'Ahl El Sham Spices is your trusted destination for premium spices, herbs, nuts, and traditional pantry essentials. We bring authentic flavors from the Levant to your kitchen.',
  story_p1_ar:
    'عطارة اهل الشام هي وجهتكم الموثوقة للبهارات والأعشاب والمكسرات ومستلزمات المطبخ التقليدية. نقدم نكهات أصيلة من بلاد الشام إلى مطبخكم.',
  story_p2_en:
    'From everyday cooking staples to specialty blends, we are committed to quality, freshness, and friendly service — with convenient WhatsApp ordering.',
  story_p2_ar:
    'من مستلزمات الطبخ اليومية إلى الخلطات المميزة، نلتزم بالجودة والطزاجة وخدمة مميزة — مع طلب مريح عبر واتساب.',
};

const sb = await resolveAhlalshamClient();

const { data: existing, error: readError } = await sb
  .from('settings')
  .select('value')
  .eq('key', 'restaurant')
  .single();
if (readError) throw readError;

const updated = { ...(existing.value ?? {}), ...patch };
const { data, error } = await sb
  .from('settings')
  .update({ value: updated, updated_at: new Date().toISOString() })
  .eq('key', 'restaurant')
  .select('value')
  .single();
if (error) throw error;

console.log('Patched Ahlalsham restaurant settings:');
console.log('  name_en:', data.value.name_en);
console.log('  name_ar:', data.value.name_ar);
console.log('  story_p1_ar:', data.value.story_p1_ar?.slice(0, 60) + '…');
