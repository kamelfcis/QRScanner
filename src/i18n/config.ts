import { isEcommerceStore } from '@/lib/store-config';

export const locales = ['en', 'ar'] as const;
export type Locale = (typeof locales)[number];

function resolveDefaultLocale(): Locale {
  const configured = process.env.NEXT_PUBLIC_DEFAULT_LOCALE?.trim().toLowerCase();
  if (configured === 'en' || configured === 'ar') return configured;
  const storeMode = process.env.NEXT_PUBLIC_STORE_MODE?.trim().toLowerCase();
  return storeMode === 'ecommerce' ? 'en' : 'ar';
}

/** Per-deployment locale. Ecommerce stays English unless the env says otherwise. */
export const defaultLocale: Locale = resolveDefaultLocale();

export const rtlLocales: Locale[] = ['ar'];
export const isRtl = (locale: Locale) => rtlLocales.includes(locale);

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇬🇧',
  ar: '🇸🇦',
};

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

const tenantId = process.env.NEXT_PUBLIC_TENANT?.trim().toLowerCase();

/** Cashier, shift sheet, expenses, kitchen print (hettsamaka + ala-keefak). */
export const hasDailyOps = tenantId === 'hettsamaka' || tenantId === 'ala-keefak';

/** Tier 1+2 ops features (hettsamaka only). */
export const hasHettSamakaTier1 = tenantId === 'hettsamaka';

/** Tier 3 ops (hettsamaka only). */
export const hasHettSamakaTier3 = tenantId === 'hettsamaka';

/** Four independently enabled sizes (ala-keefak only). */
export const hasExtendedProductSizes = tenantId === 'ala-keefak';

/** Per-kg gram picker on restaurant menus. Ecommerce keeps a single price. */
export const hasProductWeightOptions = !isEcommerceStore;

export const isAlaKeefakTenant = tenantId === 'ala-keefak';

export const alaKeefakTenantAttr = isAlaKeefakTenant
  ? ({ 'data-tenant': 'ala-keefak' } as const)
  : {};
