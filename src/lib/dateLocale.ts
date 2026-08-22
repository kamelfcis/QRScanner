import { format, type Locale } from 'date-fns';
import { arSA, enUS, fr, nl } from 'date-fns/locale';

const DATE_FNS_LOCALES: Record<string, Locale> = {
  ar: arSA,
  en: enUS,
  fr,
  nl,
};

export function getDateFnsLocale(locale: string | undefined): Locale {
  return DATE_FNS_LOCALES[locale ?? ''] ?? enUS;
}

export function formatLocaleDate(
  date: Date | string | number,
  pattern: string,
  locale: string | undefined
): string {
  const value = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return format(value, pattern, { locale: getDateFnsLocale(locale) });
}
