import type { DeliveryLocation } from '@/types/database';

/** Zone minimum when > 0, otherwise restaurant default. */
export function resolveEffectiveMinimumOrder(
  restaurantMinimum: number,
  deliveryLocation: Pick<DeliveryLocation, 'minimum_order'> | null | undefined
): number {
  const zoneMin = deliveryLocation?.minimum_order ?? 0;
  if (zoneMin > 0) return zoneMin;
  return restaurantMinimum;
}
