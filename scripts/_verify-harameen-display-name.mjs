#!/usr/bin/env node
/** Verify getRestaurantDisplayName resolves Harameen Arabic name with production env. */
process.env.NEXT_PUBLIC_TENANT = 'harameen';
process.env.NEXT_PUBLIC_APP_NAME = 'Harameen Wholesale Market';
process.env.NEXT_PUBLIC_APP_NAME_AR = 'سوق الجملة شركة الحرمين';
process.env.NEXT_PUBLIC_SITE_URL = 'https://harameen.engazqr.com';

const { getRestaurantDisplayName } = await import('../src/lib/appName.ts');

const cases = [
  { label: 'no settings, ar', locale: 'ar', settings: null },
  { label: 'no settings, en', locale: 'en', settings: null },
  {
    label: 'db settings ar',
    locale: 'ar',
    settings: { name_ar: 'سوق الجملة شركة الحرمين', name_en: 'Harameen Wholesale Market' },
  },
  {
    label: 'db empty names',
    locale: 'ar',
    settings: { name_ar: '', name_en: '' },
  },
];

for (const c of cases) {
  const name = getRestaurantDisplayName(c.locale, c.settings);
  console.log(`${c.label}: ${name}`);
}

const installTitle = `تثبيت ${getRestaurantDisplayName('ar', null)}`;
console.log('installTitle:', installTitle);
console.log('expected:', 'تثبيت سوق الجملة شركة الحرمين');
console.log('match:', installTitle === 'تثبيت سوق الجملة شركة الحرمين');
