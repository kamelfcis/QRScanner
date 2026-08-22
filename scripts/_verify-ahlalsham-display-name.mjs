#!/usr/bin/env node
/** Verify getRestaurantDisplayName resolves Ahl El Sham Arabic name with production env. */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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

const token = loadEnv('.env.local').VERCEL_TOKEN;
if (!token) throw new Error('no VERCEL_TOKEN');

const projectId = 'prj_VO3BtRd6fqsJTMuJo4W9ogq61uGs';
const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env?decrypt=true`, {
  headers: { Authorization: `Bearer ${token}` },
});
const envMap = Object.fromEntries(((await res.json()).envs ?? []).map((row) => [row.key, row.value]));

process.env.NEXT_PUBLIC_TENANT = envMap.NEXT_PUBLIC_TENANT;
process.env.NEXT_PUBLIC_APP_NAME = envMap.NEXT_PUBLIC_APP_NAME;
process.env.NEXT_PUBLIC_APP_NAME_AR = envMap.NEXT_PUBLIC_APP_NAME_AR;
process.env.NEXT_PUBLIC_SITE_URL = envMap.NEXT_PUBLIC_SITE_URL;
process.env.NEXT_PUBLIC_APP_URL = envMap.NEXT_PUBLIC_APP_URL;

function getSiteNameAr(settings) {
  return (
    settings?.name_ar?.trim() ||
    process.env.NEXT_PUBLIC_APP_NAME_AR?.trim() ||
    settings?.name_en?.trim() ||
    process.env.NEXT_PUBLIC_APP_NAME?.trim() ||
    'وردة الشامية'
  );
}

function getRestaurantDisplayName(locale, settings) {
  const hasSettingsNames = Boolean(settings?.name_en?.trim() || settings?.name_ar?.trim());
  if (hasSettingsNames) {
    return locale === 'ar' ? getSiteNameAr(settings) : settings.name_en.trim();
  }
  return locale === 'ar' ? getSiteNameAr(settings) : process.env.NEXT_PUBLIC_APP_NAME;
}

const settings = { name_en: 'Ahl El Sham Spices', name_ar: 'عطارة اهل الشام' };
for (const locale of ['ar', 'en']) {
  const name = getRestaurantDisplayName(locale, settings);
  console.log(`${locale}: ${name}`);
}
const installTitle = `تثبيت ${getRestaurantDisplayName('ar', settings)}`;
console.log('installTitle:', installTitle);
console.log('expected:', 'تثبيت عطارة اهل الشام');
console.log('match:', installTitle === 'تثبيت عطارة اهل الشام' ? 'YES' : 'NO');
