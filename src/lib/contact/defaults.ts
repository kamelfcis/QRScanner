import type { RestaurantSettings } from '@/types';

import type { Locale } from '@/i18n/config';
import { buildCustomerWhatsAppUrl } from '@/lib/phone/normalize';

export const DEFAULT_CONTACT = {
  address_ar: 'مصر',
  address_en: 'Egypt',
} as const;

export function isContactPlaceholder(value: string | null | undefined): boolean {
  if (!value?.trim()) return true;
  return value.trim().startsWith('YOUR_');
}

export function resolveContactField(value: string | null | undefined): string | null {
  if (isContactPlaceholder(value)) return null;
  return value!.trim();
}

export function resolveContactAddress(
  settings: Partial<RestaurantSettings> | null | undefined,
  locale: Locale
): string {
  const ar = resolveContactField(settings?.address_ar);
  const en = resolveContactField(settings?.address_en);

  if (locale === 'ar') {
    return ar || en || DEFAULT_CONTACT.address_ar;
  }
  return en || ar || DEFAULT_CONTACT.address_en;
}

export function formatWhatsAppUrl(whatsapp: string): string {
  return buildCustomerWhatsAppUrl(whatsapp);
}

const GOOGLE_MAPS_URL =
  /(?:google\.(?:com|[a-z]{2,3})\/maps|maps\.google\.|goo\.gl\/maps|maps\.app\.goo\.gl)/i;

export function getMapEmbedUrl(url: string | null | undefined): string | null {
  const resolved = resolveContactField(url);
  if (!resolved) return null;

  if (resolved.includes('/embed') || resolved.includes('output=embed')) {
    return resolved;
  }

  if (!GOOGLE_MAPS_URL.test(resolved)) {
    return null;
  }

  const separator = resolved.includes('?') ? '&' : '?';
  return `${resolved}${separator}output=embed`;
}
