/**
 * Default currency when restaurant settings omit currency (matches schema default).
 * Aklet Gambary trades in Egypt, so a missing value must never become Saudi riyal.
 */
export const DEFAULT_CURRENCY = 'EGP';

export type CurrencyLocale = 'en' | 'ar';

export interface FormatCurrencyOptions {
  locale?: CurrencyLocale;
  /** Use ISO code suffix (e.g. "25 EGP") instead of localized symbol — better for plain text. */
  plain?: boolean;
}

export function getRestaurantCurrency(currency?: string | null): string {
  const trimmed = currency?.trim();
  return trimmed || DEFAULT_CURRENCY;
}

function formatNumberAmount(amount: number, locale: CurrencyLocale = 'en'): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar' : 'en', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function canFormatAsCurrency(code: string): boolean {
  try {
    Intl.NumberFormat('en', { style: 'currency', currency: code }).format(0);
    return true;
  } catch {
    return false;
  }
}

/** Format amount with currency from restaurant settings (fallback EGP). */
export function formatCurrencyAmount(
  amount: number,
  currency?: string | null,
  options?: FormatCurrencyOptions
): string {
  const code = getRestaurantCurrency(currency);
  const locale = options?.locale ?? 'en';

  if (!options?.plain && canFormatAsCurrency(code)) {
    try {
      const intlLocale = locale === 'ar' ? 'ar' : 'en';
      return new Intl.NumberFormat(intlLocale, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      // fall through to plain format
    }
  }

  return `${formatNumberAmount(amount, locale)} ${code}`;
}

/** Format numeric amount only (for i18n templates that separate currency). */
export function formatCurrencyNumber(amount: number, locale: CurrencyLocale = 'en'): string {
  return formatNumberAmount(amount, locale);
}
