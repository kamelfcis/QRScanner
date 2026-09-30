import { env } from '@/lib/env';
import { getName } from '@/lib/utils';

export function getAppNameFallback(): string {
  return env.NEXT_PUBLIC_APP_NAME;
}

export function getSiteNameEn(settings?: { name_en?: string | null } | null): string {
  return settings?.name_en?.trim() || env.NEXT_PUBLIC_APP_NAME?.trim() || 'Restaurant';
}

export function getSiteNameAr(
  settings?: { name_ar?: string | null; name_en?: string | null } | null
): string {
  const arEnv = process.env.NEXT_PUBLIC_APP_NAME_AR?.trim();
  return (
    settings?.name_ar?.trim() ||
    arEnv ||
    settings?.name_en?.trim() ||
    env.NEXT_PUBLIC_APP_NAME?.trim() ||
    'Restaurant'
  );
}

export function getSiteNameForLocale(
  locale: string | undefined,
  settings?: { name_en?: string | null; name_ar?: string | null } | null
): string {
  return locale === 'ar' ? getSiteNameAr(settings) : getSiteNameEn(settings);
}

export function getRestaurantDisplayName(
  locale: string | undefined,
  settings?: { name_en?: string | null; name_ar?: string | null } | null
): string {
  const fallback = getAppNameFallback();

  if (!settings?.name_en && !settings?.name_ar) {
    return getSiteNameForLocale(locale, settings) || fallback;
  }

  return getName(
    locale,
    settings.name_en || fallback,
    settings.name_ar || settings.name_en || fallback
  );
}
