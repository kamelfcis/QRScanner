export const locales = ['en', 'ar'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ar';

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
