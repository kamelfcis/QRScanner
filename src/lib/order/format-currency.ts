/** Default currency when restaurant settings omit currency (matches schema default). */
export const DEFAULT_CURRENCY = 'SAR';

export type CurrencyLocale = 'en' | 'ar' | 'fr' | 'nl';

const CURRENCY_LOCALES: readonly CurrencyLocale[] = ['en', 'ar', 'fr', 'nl'];

export function toCurrencyLocale(locale: string | undefined): CurrencyLocale {
  if (locale && (CURRENCY_LOCALES as readonly string[]).includes(locale)) {
    return locale as CurrencyLocale;
  }
  return 'en';
}

export interface FormatCurrencyOptions {
  locale?: CurrencyLocale;
  /** Use ISO code suffix (e.g. "25 SAR") instead of localized symbol — better for plain text. */
  plain?: boolean;
}

export function getRestaurantCurrency(currency?: string | null): string {
  const trimmed = currency?.trim();
  return trimmed || DEFAULT_CURRENCY;
}

function intlLocaleForCurrency(locale: CurrencyLocale): string {
  switch (locale) {
    case 'ar':
      return 'ar';
    case 'fr':
      return 'fr';
    case 'nl':
      return 'nl';
    default:
      return 'en';
  }
}

function formatNumberAmount(amount: number, locale: CurrencyLocale = 'en'): string {
  return new Intl.NumberFormat(intlLocaleForCurrency(locale), {
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

/** Format amount with currency from restaurant settings (fallback SAR). */
export function formatCurrencyAmount(
  amount: number,
  currency?: string | null,
  options?: FormatCurrencyOptions
): string {
  const code = getRestaurantCurrency(currency);
  const locale = options?.locale ?? 'en';

  if (!options?.plain && canFormatAsCurrency(code)) {
    try {
      return new Intl.NumberFormat(intlLocaleForCurrency(locale), {
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
