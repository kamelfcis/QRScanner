import {
  formatCurrencyAmount,
  type CurrencyLocale,
} from '@/lib/order/format-currency';
import { getName } from '@/lib/utils';
import type { DeliveryLocation } from '@/types/database';

type DeliveryLocationNames = Pick<
  DeliveryLocation,
  'name_en' | 'name_ar' | 'name_fr' | 'name_nl'
>;

type DeliveryLocationOption = DeliveryLocationNames &
  Pick<DeliveryLocation, 'delivery_fee'>;

export function getDeliveryLocationLabel(
  locale: string,
  location: DeliveryLocationNames
): string {
  return getName(locale, location.name_en, location.name_ar, location.name_fr, location.name_nl);
}

export function formatDeliveryLocationOption(
  locale: string,
  location: DeliveryLocationOption,
  currency: string,
  currencyLocale: CurrencyLocale = 'en'
): string {
  const name = getDeliveryLocationLabel(locale, location);
  const fee = formatCurrencyAmount(Number(location.delivery_fee), currency, {
    locale: currencyLocale,
  });
  return `${name} — ${fee}`;
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
