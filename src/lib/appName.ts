import { env } from '@/lib/env';
import { getLocalizedText } from '@/lib/utils';
import { loginThemes } from '@/lib/login/themes';
import { resolveLoginTenant } from '@/lib/login/resolve-login-brand';

const DEFAULT_SITE_NAME_EN = 'Warda Shamya';
const DEFAULT_SITE_NAME_AR = 'وردة الشامية';

function tenantBrandFallback(): { en: string; ar: string } {
  const tenantId = resolveLoginTenant();
  const theme = loginThemes[tenantId];
  if (tenantId === 'custom') {
    return { en: DEFAULT_SITE_NAME_EN, ar: DEFAULT_SITE_NAME_AR };
  }
  return { en: theme.nameEn, ar: theme.nameAr };
}

export function getAppNameFallback(): string {
  return env.NEXT_PUBLIC_APP_NAME;
}

export function getSiteNameEn(settings?: { name_en?: string | null } | null): string {
  const brand = tenantBrandFallback();
  return (
    settings?.name_en?.trim() ||
    env.NEXT_PUBLIC_APP_NAME?.trim() ||
    brand.en ||
    DEFAULT_SITE_NAME_EN
  );
}

export function getSiteNameAr(
  settings?: { name_ar?: string | null; name_en?: string | null } | null
): string {
  const brand = tenantBrandFallback();
  const arEnv = process.env.NEXT_PUBLIC_APP_NAME_AR?.trim();
  return (
    settings?.name_ar?.trim() ||
    arEnv ||
    settings?.name_en?.trim() ||
    env.NEXT_PUBLIC_APP_NAME?.trim() ||
    brand.ar ||
    DEFAULT_SITE_NAME_AR
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
  const hasSettingsNames = Boolean(settings?.name_en?.trim() || settings?.name_ar?.trim());

  if (hasSettingsNames) {
    return getLocalizedText(locale, {
      en: getSiteNameEn(settings),
      ar: getSiteNameAr(settings),
    });
  }

  return getSiteNameForLocale(locale, settings);
}
