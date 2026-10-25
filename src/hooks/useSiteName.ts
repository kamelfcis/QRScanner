'use client';

import { useI18n } from '@/components/providers/RootI18nProvider';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { getName } from '@/lib/utils';
import type { RestaurantSettings } from '@/types';

type NameSettings = { name_en?: string | null; name_ar?: string | null } | null | undefined;

/** Locale-aware name from restaurant settings only. No static brand fallback. */
export function siteNameFromSettings(locale: string | undefined, settings: NameSettings): string {
  const nameEn = settings?.name_en?.trim() || '';
  const nameAr = settings?.name_ar?.trim() || '';
  if (!nameEn && !nameAr) return '';
  return getName(locale, nameEn, nameAr);
}

/**
 * `ready` is true only after the restaurant settings query has settled.
 * While it is pending, `name` is empty so callers do not paint a fallback brand.
 */
export function useSiteNameState(): {
  name: string;
  ready: boolean;
  settings: RestaurantSettings | null;
} {
  const { locale } = useI18n();
  const query = useRestaurantSettings();
  const ready = !query.isPending;
  const settings = ready ? (query.data ?? null) : null;
  const name = ready ? siteNameFromSettings(locale, settings) : '';
  return { name, ready, settings };
}

/** Empty until `ready`. After that, only `name_ar` / `name_en` from settings. */
export function getLiveSiteName(
  locale: string | undefined,
  settings: NameSettings,
  ready: boolean
): string {
  if (!ready) return '';
  return siteNameFromSettings(locale, settings);
}

/** Locale-aware restaurant name. Empty until restaurant settings have settled. */
export function useSiteName(): string {
  return useSiteNameState().name;
}
