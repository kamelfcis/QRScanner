import { env } from '@/lib/env';
import { resolveLoginTenant } from '@/lib/login/resolve-login-brand';

const WARDA_DEFAULT_HERO = '/hero/warda-storefront.jpg';

/** Grocery-market placeholder when no tenant cover is uploaded. */
const GENERIC_DEFAULT_HERO =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=2400&q=80';

function isWardaStorefrontAsset(url: string): boolean {
  return url.toLowerCase().includes('warda-storefront');
}

function tenantDefaultHero(): string | null {
  const tenant = resolveLoginTenant();
  if (tenant === 'warda') return WARDA_DEFAULT_HERO;
  if (tenant === 'harameen' || tenant === 'aklet') return GENERIC_DEFAULT_HERO;
  return null;
}

export function getHeroImageUrl(heroImageUrl?: string | null): string | null {
  const trimmed = heroImageUrl?.trim();
  if (trimmed) {
    if (resolveLoginTenant() !== 'warda' && isWardaStorefrontAsset(trimmed)) {
      return tenantDefaultHero();
    }
    return trimmed;
  }
  return tenantDefaultHero();
}

/** @deprecated Prefer getHeroImageUrl; kept for callers that require a non-null string. */
export const DEFAULT_HERO = WARDA_DEFAULT_HERO;

export function getHeroImageUrlOrFallback(heroImageUrl?: string | null): string {
  return getHeroImageUrl(heroImageUrl) ?? WARDA_DEFAULT_HERO;
}

export function getTenantIdForHero(): string | undefined {
  return env.NEXT_PUBLIC_TENANT ?? resolveLoginTenant();
}
