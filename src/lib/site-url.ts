const DEFAULT_PUBLIC_SITE_URL = 'https://engzqrmenu.vercel.app';

/** Normalize a site origin (no trailing slash). */
export function normalizeSiteUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Public site origin for customer-facing URLs (QR codes, /links, OG tags).
 * Prefers NEXT_PUBLIC_SITE_URL, then NEXT_PUBLIC_APP_URL, then browser origin in client.
 */
export function getPublicSiteUrl(fallbackOrigin?: string): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (fromEnv) {
    return normalizeSiteUrl(fromEnv);
  }

  if (fallbackOrigin) {
    return normalizeSiteUrl(fallbackOrigin);
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeSiteUrl(window.location.origin);
  }

  return DEFAULT_PUBLIC_SITE_URL;
}

/** Absolute URL for the public Linktree-style /links page. */
export function buildLinksPageUrl(fallbackOrigin?: string): string {
  return `${getPublicSiteUrl(fallbackOrigin)}/links`;
}
