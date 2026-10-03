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
