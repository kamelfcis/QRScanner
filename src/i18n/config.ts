export const locales = ['ar', 'en', 'fr', 'nl'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ar';

export const rtlLocales: Locale[] = ['ar'];
export const isRtl = (locale: Locale) => rtlLocales.includes(locale);

export const localeNames: Record<Locale, string> = {
  ar: 'العربية',
  en: 'English',
  fr: 'Français',
  nl: 'Nederlands',
};

export const localeFlags: Record<Locale, string> = {
  ar: '🇸🇦',
  en: '🇬🇧',
  fr: '🇫🇷',
  nl: '🇳🇱',
};

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}
