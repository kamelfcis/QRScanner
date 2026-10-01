import type { RestaurantSettings } from '@/types/database';

export interface PrepTimeDisplay {
  value: number;
  unit: 'days' | 'minutes';
}

function isEcommerceMode(): boolean {
  return process.env.NEXT_PUBLIC_STORE_MODE?.trim().toLowerCase() === 'ecommerce';
}

/** Resolve prep time for checkout / WhatsApp — days for ecommerce, minutes for restaurant. */
export function resolvePrepTimeDisplay(
  settings?: Pick<RestaurantSettings, 'prep_time_minutes' | 'prep_time_days'> | null
): PrepTimeDisplay | null {
  if (isEcommerceMode()) {
    const days = settings?.prep_time_days;
    if (days == null || days <= 0) return null;
    return { value: days, unit: 'days' };
  }

  const minutes = settings?.prep_time_minutes ?? 25;
  if (minutes <= 0) return null;
  return { value: minutes, unit: 'minutes' };
}

export function formatPrepTimeEta(
  prep: PrepTimeDisplay,
  labels: { days: (count: number) => string; minutes: (count: number) => string }
): string {
  return prep.unit === 'days' ? labels.days(prep.value) : labels.minutes(prep.value);
}
