import { toWhatsAppDigits } from '@/lib/phone/normalize';
import { DEFAULT_COUNTRY } from '@/lib/phone/country-dial';

/** Normalize phone to international digits for wa.me links. */
export function normalizeWhatsAppPhone(phone: string, defaultCountry = DEFAULT_COUNTRY): string {
  return toWhatsAppDigits(phone, defaultCountry);
}

export function buildWhatsAppUrl(
  phone: string,
  message: string,
  defaultCountry = DEFAULT_COUNTRY
): string {
  const digits = toWhatsAppDigits(phone, defaultCountry);
  if (!digits) {
    throw new Error('WhatsApp phone number is required');
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
