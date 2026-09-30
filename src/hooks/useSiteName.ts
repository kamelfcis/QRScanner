'use client';

import { useI18n } from '@/components/providers/RootI18nProvider';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { getRestaurantDisplayName } from '@/lib/appName';

/** Locale-aware restaurant/store name from settings or NEXT_PUBLIC_APP_NAME. */
export function useSiteName(): string {
  const { locale } = useI18n();
  const { data: settings } = useRestaurantSettings();
  return getRestaurantDisplayName(locale, settings ?? null);
}
