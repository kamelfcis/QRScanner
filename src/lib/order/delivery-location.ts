import { getName } from '@/lib/utils';
import type { DeliveryLocation } from '@/types/database';

export function getDeliveryLocationLabel(
  locale: string,
  location: Pick<DeliveryLocation, 'name_en' | 'name_ar' | 'name_fr' | 'name_nl'>
): string {
  return getName(locale, location.name_en, location.name_ar, location.name_fr, location.name_nl);
}

export function buildDeliveryAddressSnapshot(
  locale: string,
  location: Pick<DeliveryLocation, 'name_en' | 'name_ar' | 'name_fr' | 'name_nl'>,
  details?: string | null
): string {
  const parts = [getDeliveryLocationLabel(locale, location)];
  const trimmed = details?.trim();
  if (trimmed) parts.push(trimmed);
  return parts.join('\n');
}
