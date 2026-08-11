export function getCustomerFaviconUrls(productionUrl: string | null): {
  direct: string | null;
  google: string | null;
} {
  if (!productionUrl) {
    return { direct: null, google: null };
  }

  try {
    const url = new URL(productionUrl);
    return {
      direct: `${url.origin}/favicon.ico`,
      google: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url.hostname)}&sz=64`,
    };
  } catch {
    return { direct: null, google: null };
  }
}

export function customerLogoFallbackLetter(displayName: string): string {
  const letter = displayName.trim().charAt(0);
  return letter ? letter.toUpperCase() : '?';
}
