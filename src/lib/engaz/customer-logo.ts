export const CUSTOMER_LOGO_PLACEHOLDER_PATH = '/brand/customer-logo-placeholder.svg';

export function getRegistrationLogoPublicUrl(logoPath: string | null | undefined): string | null {
  if (!logoPath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  if (!base) return null;
  return `${base}/storage/v1/object/public/registration-logos/${logoPath}`;
}

export function getCustomerLogoPlaceholderPath(): string {
  return CUSTOMER_LOGO_PLACEHOLDER_PATH;
}

export function buildLogoCandidates(options: {
  liveLogoUrl?: string | null;
  registrationLogoUrl?: string | null;
}): string[] {
  const candidates: string[] = [];
  if (options.liveLogoUrl) candidates.push(options.liveLogoUrl);
  if (options.registrationLogoUrl) candidates.push(options.registrationLogoUrl);
  candidates.push(getCustomerLogoPlaceholderPath());
  return candidates;
}

/** @deprecated Not used in CustomerLogo fallback chain; kept for optional debug tooling. */
export function getCustomerFaviconUrls(productionUrl: string | null): string[] {
  if (!productionUrl) {
    return [];
  }

  try {
    const url = new URL(productionUrl);
    const origin = url.origin;
    const googleFavicon = `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(origin)}&size=128`;

    return [`${origin}/icon`, `${origin}/apple-icon.png`, `${origin}/favicon.ico`, googleFavicon];
  } catch {
    return [];
  }
}

export function customerLogoFallbackLetter(displayName: string): string {
  const letter = displayName.trim().charAt(0);
  return letter ? letter.toUpperCase() : '?';
}
