#!/usr/bin/env node
/**
 * One-off: seed MAZEN STORE restaurant name in customer Supabase settings.
 * Uses SUPABASE_SERVICE_ROLE_KEY from .env.local (vercel env pull).
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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

const env = { ...loadEnv('.env'), ...loadEnv('.env.local') };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const restaurant = {
  name_en: 'MAZEN STORE',
  name_ar: 'MAZEN STORE',
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
  qr_target_path: '/menu',
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
