import { env } from '@/lib/env';
import { getName } from '@/lib/utils';

export function getAppNameFallback(): string {
  return env.NEXT_PUBLIC_APP_NAME;
}

export function getRestaurantDisplayName(
  locale: string | undefined,
  settings?: { name_en?: string | null; name_ar?: string | null } | null
): string {
  const fallback = getAppNameFallback();

  if (!settings?.name_en && !settings?.name_ar) {
    return fallback;
  }

  return getName(
    locale,
    settings.name_en || fallback,
    settings.name_ar || settings.name_en || fallback
  );
}
