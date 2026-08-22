import type { RestaurantSettings } from '@/types';

import type { Locale } from '@/i18n/config';

export const DEFAULT_CONTACT = {
  address_ar: 'مصر',
  address_en: 'Egypt',
} as const;

export function resolveContactAddress(
  settings: Partial<RestaurantSettings> | null | undefined,
  locale: Locale
): string {
  const ar = settings?.address_ar?.trim();
  const en = settings?.address_en?.trim();

  if (locale === 'ar') {
    return ar || en || DEFAULT_CONTACT.address_ar;
  }
  return en || ar || DEFAULT_CONTACT.address_en;
}

export function formatWhatsAppUrl(whatsapp: string): string {
  return `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`;
}

export function getMapEmbedUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.includes('/embed')) return trimmed;
  if (trimmed.includes('google.com/maps') || trimmed.includes('goo.gl/maps')) {
    const separator = trimmed.includes('?') ? '&' : '?';
    return `${trimmed}${separator}output=embed`;
  }
  return null;
}
