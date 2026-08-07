import { format, type Locale } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';

export function getDateFnsLocale(locale: string | undefined): Locale {
  return locale === 'ar' ? arSA : enUS;
}

export function formatLocaleDate(
  date: Date | string | number,
  pattern: string,
  locale: string | undefined
): string {
  const value = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return format(value, pattern, { locale: getDateFnsLocale(locale) });
}
