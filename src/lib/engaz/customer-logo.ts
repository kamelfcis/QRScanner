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
