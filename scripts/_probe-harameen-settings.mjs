#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { createDecipheriv } from 'crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGaz_ROOT = resolve(ROOT, '../engaz-admin-wt');

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

async function resolveHarameenClient() {
  const localEnv = { ...loadEnvFile('.env'), ...loadEnvFile('.env.local') };
  const token = localEnv.VERCEL_TOKEN;
  const projectId = 'prj_nTFxxfwomv65CwKmJCy0xxrlnqS7';
  if (token) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env?decrypt=true`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      clearTimeout(timer);
      const json = await res.json();
      const envMap = Object.fromEntries((json.envs ?? []).map((row) => [row.key, row.value]));
      if (envMap.NEXT_PUBLIC_SUPABASE_URL && envMap.SUPABASE_SERVICE_ROLE_KEY) {
        return createClient(envMap.NEXT_PUBLIC_SUPABASE_URL, envMap.SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false },
        });
      }
    } catch (err) {
      clearTimeout(timer);
      console.warn('Vercel env fetch failed, trying Engaz fallback:', err?.message ?? err);
    }
  }

  const engazEnv = { ...loadEnvFile('.env.local', ENGaz_ROOT), ...loadEnvFile('.env', ENGaz_ROOT) };
  const admin = createClient(engazEnv.NEXT_PUBLIC_SUPABASE_URL, engazEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data: customers } = await admin
    .from('customers')
    .select('id, slug')
    .or('slug.eq.harameen,slug.ilike.%harameen%');
  const customer = customers?.[0];
  if (!customer) throw new Error('Harameen customer not found');

  const { data: sec } = await admin
    .from('customer_secrets')
    .select('ciphertext, iv, auth_tag')
    .eq('customer_id', customer.id)
    .maybeSingle();
  if (!sec) throw new Error('Harameen secrets not found in Engaz');
  const secrets = decryptJson({ ...sec, authTag: sec.auth_tag }, engazEnv.ENGAZ_SECRETS_KEY);
  return createClient(secrets.supabaseUrl, secrets.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}

const harameen = await resolveHarameenClient();

const { data: settings } = await harameen.from('settings').select('value').eq('key', 'restaurant').single();
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
console.log('RESTAURANT SETTINGS:');
for (const f of fields) console.log(`${f}:`, v[f] ?? '(null)');

const { data: gallery } = await harameen
  .from('gallery')
  .select('id, image_url, is_featured, is_visible, caption_en')
  .order('sort_order')
  .limit(10);
console.log('\nGALLERY:', JSON.stringify(gallery, null, 2));

const { data: buckets } = await harameen.storage.listBuckets();
console.log('\nBUCKETS:', buckets?.map((b) => b.name));

if (buckets?.length) {
  for (const b of buckets) {
    const { data: files } = await harameen.storage.from(b.name).list('', { limit: 30 });
    console.log(`Files in ${b.name}:`, files?.map((f) => f.name));
    if (b.name === 'covers') {
      for (const folder of files ?? []) {
        if (!folder.id) continue;
        const { data: nested } = await harameen.storage.from(b.name).list(folder.name, { limit: 20 });
        console.log(`  ${folder.name}/`, nested?.map((f) => f.name));
      }
    }
  }
}
