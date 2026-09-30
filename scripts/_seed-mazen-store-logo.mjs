#!/usr/bin/env node
/**
 * One-off: upload MAZEN STORE logo and seed restaurant settings (name + logo_url).
 * Uses .env.mazen-store.pull (vercel env pull --environment=production).
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOGO_PATH = resolve(ROOT, 'public/logo.png');

function loadEnv(name) {
  const env = {};
  const p = resolve(ROOT, name);
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

const env = { ...loadEnv('.env.mazen-store.pull') };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.mazen-store.pull');
  process.exit(1);
}

if (!existsSync(LOGO_PATH)) {
  console.error('Missing public/logo.png');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const logoBytes = readFileSync(LOGO_PATH);
const storagePath = `mazen-store-logo-${Date.now()}.png`;

const { error: uploadError } = await supabase.storage
  .from('logos')
  .upload(storagePath, logoBytes, {
    contentType: 'image/png',
    cacheControl: '31536000',
    upsert: true,
  });

if (uploadError) {
  console.error('Logo upload failed:', uploadError.message);
  process.exit(1);
}

const { data: urlData } = supabase.storage.from('logos').getPublicUrl(storagePath);
const logoUrl = urlData.publicUrl;

const restaurant = {
  name_en: 'MAZEN STORE',
  name_ar: 'MAZEN STORE',
  logo_url: logoUrl,
  phone: '',
  whatsapp: '',
  instagram: '',
  facebook: '',
  tiktok: '',
  address_ar: '',
  address_en: '',
  currency: 'EGP',
  tax_rate: 0,
  service_charge_rate: 0,
  qr_target_path: '/welcome',
};

const { data, error } = await supabase
  .from('settings')
  .upsert({ key: 'restaurant', value: restaurant }, { onConflict: 'key' })
  .select('key')
  .single();

if (error) {
  console.error('Failed to seed restaurant settings:', error.message);
  process.exit(1);
}

console.log('Seeded restaurant settings:', data?.key);
console.log('Logo URL:', logoUrl);
