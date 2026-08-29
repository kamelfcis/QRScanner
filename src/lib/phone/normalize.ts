import {
  DEFAULT_COUNTRY,
  dialCodesByLengthDesc,
  getDialCode,
  resolveCountryCode,
} from './country-dial';

export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** Convert a local mobile number to international digits (no + prefix). */
export function normalizeLocalPhone(local: string, countryCode: string): string {
  let digits = digitsOnly(local);
  if (!digits) return '';

  const country = resolveCountryCode(countryCode);
  const dialCode = getDialCode(country);

  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (digits.startsWith(dialCode)) {
    return digits;
  }

  return `${dialCode}${digits}`;
}

/** Normalize any phone string to wa.me-compatible international digits. */
export function toWhatsAppDigits(phone: string, defaultCountry = DEFAULT_COUNTRY): string {
  let digits = digitsOnly(phone);
  if (!digits) return '';

  // `00` is the international access prefix (same meaning as `+`).
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
    if (!digits) return '';
  }

  for (const entry of dialCodesByLengthDesc()) {
    if (digits.startsWith(entry.dialCode) && digits.length >= entry.minLength) {
      return digits;
    }
  }

  return normalizeLocalPhone(digits, defaultCountry);
}

function formatNationalDigits(national: string): string {
  if (national.length === 10) {
    return `${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
  }
  return national.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
}

/** Format international digits for display, e.g. +20 150 153 4655 */
export function formatDisplayPhone(digits: string): string {
  const normalized = digitsOnly(digits);
  if (!normalized) return '';

  for (const entry of dialCodesByLengthDesc()) {
    if (normalized.startsWith(entry.dialCode)) {
      const national = normalized.slice(entry.dialCode.length);
      const grouped = formatNationalDigits(national);
      return `+${entry.dialCode}${grouped ? ` ${grouped}` : ''}`;
    }
  }

  return `+${normalized}`;
}

export function buildCustomerWhatsAppUrl(digits: string): string {
  const waDigits = toWhatsAppDigits(digits);
  if (!waDigits) return '';
  return `https://wa.me/${waDigits}`;
}

/** Build a tel: URI with normalized international digits. */
export function buildTelUri(phone: string, defaultCountry = DEFAULT_COUNTRY): string {
  const digits = toWhatsAppDigits(phone, defaultCountry);
  if (!digits) return '';
  return `tel:+${digits}`;
}
