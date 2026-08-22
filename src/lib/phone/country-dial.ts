export interface CountryDialInfo {
  dialCode: string;
  nameEn: string;
  nameAr: string;
}

/** ISO 3166-1 alpha-2 → dial metadata for checkout auto-detect and normalization. */
export const COUNTRY_DIAL: Record<string, CountryDialInfo> = {
  EG: { dialCode: '20', nameEn: 'Egypt', nameAr: 'مصر' },
  SA: { dialCode: '966', nameEn: 'Saudi Arabia', nameAr: 'السعودية' },
  AE: { dialCode: '971', nameEn: 'United Arab Emirates', nameAr: 'الإمارات' },
  QA: { dialCode: '974', nameEn: 'Qatar', nameAr: 'قطر' },
  KW: { dialCode: '965', nameEn: 'Kuwait', nameAr: 'الكويت' },
  BH: { dialCode: '973', nameEn: 'Bahrain', nameAr: 'البحرين' },
  OM: { dialCode: '968', nameEn: 'Oman', nameAr: 'عُمان' },
  JO: { dialCode: '962', nameEn: 'Jordan', nameAr: 'الأردن' },
  LB: { dialCode: '961', nameEn: 'Lebanon', nameAr: 'لبنان' },
  SY: { dialCode: '963', nameEn: 'Syria', nameAr: 'سوريا' },
  IQ: { dialCode: '964', nameEn: 'Iraq', nameAr: 'العراق' },
  PS: { dialCode: '970', nameEn: 'Palestine', nameAr: 'فلسطين' },
  TR: { dialCode: '90', nameEn: 'Turkey', nameAr: 'تركيا' },
  NL: { dialCode: '31', nameEn: 'Netherlands', nameAr: 'هولندا' },
  FR: { dialCode: '33', nameEn: 'France', nameAr: 'فرنسا' },
  DE: { dialCode: '49', nameEn: 'Germany', nameAr: 'ألمانيا' },
  GB: { dialCode: '44', nameEn: 'United Kingdom', nameAr: 'المملكة المتحدة' },
  US: { dialCode: '1', nameEn: 'United States', nameAr: 'الولايات المتحدة' },
};

export const DEFAULT_COUNTRY = 'EG';

const TIMEZONE_COUNTRY: Record<string, string> = {
  'Africa/Cairo': 'EG',
  'Asia/Riyadh': 'SA',
  'Asia/Dubai': 'AE',
  'Asia/Qatar': 'QA',
  'Asia/Kuwait': 'KW',
  'Asia/Bahrain': 'BH',
  'Asia/Muscat': 'OM',
  'Asia/Amman': 'JO',
  'Asia/Beirut': 'LB',
  'Asia/Damascus': 'SY',
  'Asia/Baghdad': 'IQ',
  'Asia/Gaza': 'PS',
  'Europe/Amsterdam': 'NL',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/London': 'GB',
};

const CURRENCY_COUNTRY: Record<string, string> = {
  EGP: 'EG',
  SAR: 'SA',
  AED: 'AE',
  QAR: 'QA',
  KWD: 'KW',
  BHD: 'BH',
  OMR: 'OM',
  JOD: 'JO',
  LBP: 'LB',
  SYP: 'SY',
  IQD: 'IQ',
  ILS: 'PS',
  TRY: 'TR',
  EUR: 'NL',
  GBP: 'GB',
  USD: 'US',
};

export function resolveCountryCode(raw: string | null | undefined): string {
  const code = raw?.trim().toUpperCase();
  if (code && COUNTRY_DIAL[code]) return code;
  return DEFAULT_COUNTRY;
}

export function getDialCode(country: string): string {
  return (
    COUNTRY_DIAL[resolveCountryCode(country)]?.dialCode ?? COUNTRY_DIAL[DEFAULT_COUNTRY].dialCode
  );
}

export function getCountryPrefix(country: string): string {
  return `+${getDialCode(country)}`;
}

export function getCountryName(country: string, locale: string): string {
  const info = COUNTRY_DIAL[resolveCountryCode(country)];
  if (!info) return COUNTRY_DIAL[DEFAULT_COUNTRY].nameEn;
  return locale === 'ar' ? info.nameAr : info.nameEn;
}

export function countryFromTimezone(timezone: string | null | undefined): string | null {
  if (!timezone) return null;
  return TIMEZONE_COUNTRY[timezone] ?? null;
}

export function countryFromCurrency(currency: string | null | undefined): string | null {
  if (!currency) return null;
  return CURRENCY_COUNTRY[currency.trim().toUpperCase()] ?? null;
}

/** Dial codes sorted longest-first for international prefix detection. */
export function dialCodesByLengthDesc(): Array<{
  country: string;
  dialCode: string;
  minLength: number;
}> {
  return Object.entries(COUNTRY_DIAL)
    .map(([country, info]) => ({
      country,
      dialCode: info.dialCode,
      minLength: info.dialCode.length + 7,
    }))
    .sort((a, b) => b.dialCode.length - a.dialCode.length);
}
