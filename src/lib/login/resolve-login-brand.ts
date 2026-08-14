import type { RestaurantSettings, ThemeSettings } from '@/types';
import { loginThemes } from './themes';
import type { LoginBrandConfig, LoginTenantId } from './types';

const TENANT_IDS: readonly LoginTenantId[] = ['harameen', 'aklet', 'warda', 'custom'];

const TENANT_ADMIN_EMAIL: Record<Exclude<LoginTenantId, 'custom'>, string> = {
  warda: 'admin@wardashamya.com',
  aklet: 'admin@akletgambary.com',
  harameen: 'admin@harameen.com',
};

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

function isLoginTenantId(value: string): value is LoginTenantId {
  return (TENANT_IDS as readonly string[]).includes(value);
}

function isWardaStorefrontAsset(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.toLowerCase().includes('warda-storefront');
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function overlayHex(value: string | null | undefined, fallback: string): string {
  if (value && HEX_COLOR.test(value)) return value;
  return fallback;
}

/**
 * Pick a login theme from existing app env. Never reads window.location.host.
 * Optional NEXT_PUBLIC_TENANT wins; otherwise APP_NAME / SITE_URL / APP_URL.
 */
export function resolveLoginTenant(): LoginTenantId {
  const override = (process.env.NEXT_PUBLIC_TENANT || '').trim().toLowerCase();
  if (isLoginTenantId(override)) return override;

  const haystack = [
    process.env.NEXT_PUBLIC_APP_NAME,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/aklet|أكلة|akla|gambary|gambari/.test(haystack)) return 'aklet';
  if (/warda|وردة|shamya|شامية/.test(haystack)) return 'warda';
  if (/harameen|الحرمين/.test(haystack)) return 'harameen';

  return 'custom';
}

function resolveHeroImageUrl(
  tenantId: LoginTenantId,
  liveHero: string | null,
  staticHero: string | null
): string | null {
  const candidate = tenantId === 'custom' ? liveHero : liveHero || staticHero;
  if (!candidate) return null;
  if (tenantId !== 'warda' && isWardaStorefrontAsset(candidate)) {
    return null;
  }
  return candidate;
}

function mergeCustomLoginBrand(
  base: LoginBrandConfig,
  restaurant?: RestaurantSettings | null,
  theme?: ThemeSettings | null
): LoginBrandConfig {
  const appNameFallback = firstNonEmpty(process.env.NEXT_PUBLIC_APP_NAME);
  const nameAr = firstNonEmpty(restaurant?.name_ar, appNameFallback) ?? '';
  const nameEn = firstNonEmpty(restaurant?.name_en, appNameFallback) ?? '';
  const tagline = firstNonEmpty(restaurant?.tagline);
  const liveHero = firstNonEmpty(restaurant?.hero_image_url);

  return {
    ...base,
    nameAr,
    nameEn,
    taglineAr: tagline ?? '',
    taglineEn: tagline ?? '',
    logoUrl: firstNonEmpty(restaurant?.logo_url),
    heroImageUrl: resolveHeroImageUrl('custom', liveHero, null),
    tokens: {
      ...base.tokens,
      primary: overlayHex(theme?.primary_color, base.tokens.primary),
      accent: overlayHex(theme?.accent_color, base.tokens.accent),
      background: overlayHex(theme?.background_color, base.tokens.background),
    },
  };
}

export function mergeLiveLoginBrand(
  base: LoginBrandConfig,
  restaurant?: RestaurantSettings | null,
  theme?: ThemeSettings | null
): LoginBrandConfig {
  if (base.tenantId === 'custom') {
    return mergeCustomLoginBrand(base, restaurant, theme);
  }

  const nameAr = firstNonEmpty(restaurant?.name_ar, base.nameAr) ?? base.nameAr;
  const nameEn = firstNonEmpty(restaurant?.name_en, base.nameEn) ?? base.nameEn;
  const tagline = firstNonEmpty(restaurant?.tagline);
  const liveHero = firstNonEmpty(restaurant?.hero_image_url);

  return {
    ...base,
    nameAr,
    nameEn,
    taglineAr: tagline ?? base.taglineAr,
    taglineEn: tagline ?? base.taglineEn,
    logoUrl: firstNonEmpty(restaurant?.logo_url) ?? base.logoUrl,
    heroImageUrl: resolveHeroImageUrl(base.tenantId, liveHero, base.heroImageUrl),
    tokens: {
      ...base.tokens,
      primary: overlayHex(theme?.primary_color, base.tokens.primary),
      accent: overlayHex(theme?.accent_color, base.tokens.accent),
      background: overlayHex(theme?.background_color, base.tokens.background),
    },
  };
}

function compactTenantSlug(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'restaurant'
  );
}

function tenantSlugFromEnv(): string | null {
  const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim();
  if (appName) return compactTenantSlug(appName);

  const url = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!url) return null;

  try {
    const host = new URL(url).hostname;
    const sub = host.split('.')[0];
    if (sub && sub !== 'www') return compactTenantSlug(sub);
  } catch {
    /* ignore invalid URL */
  }

  return null;
}

export function resolveLoginEmailPlaceholder(
  tenantId: LoginTenantId,
  restaurant?: RestaurantSettings | null
): string {
  const fromSettings = restaurant?.email?.trim();
  if (fromSettings) return fromSettings;

  if (tenantId !== 'custom') {
    return TENANT_ADMIN_EMAIL[tenantId];
  }

  const slug = tenantSlugFromEnv();
  return slug ? `admin@${slug}.com` : 'admin@example.com';
}

export function resolveLoginBrand(options?: {
  restaurant?: RestaurantSettings | null;
  theme?: ThemeSettings | null;
}): LoginBrandConfig {
  const tenantId = resolveLoginTenant();
  const brand = mergeLiveLoginBrand(loginThemes[tenantId], options?.restaurant, options?.theme);
  return {
    ...brand,
    emailPlaceholder: resolveLoginEmailPlaceholder(tenantId, options?.restaurant),
  };
}
