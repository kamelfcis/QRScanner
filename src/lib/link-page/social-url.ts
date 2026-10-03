/** Normalize Facebook profile or share URL from a full URL or path/handle. */
export function normalizeFacebookUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://facebook.com/${trimmed.replace(/^\/+/, '')}`;
}

/** Normalize Instagram profile URL from a full URL or @handle. */
export function normalizeInstagramUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const handle = trimmed.replace(/^@/, '').replace(/^\/+/, '').replace(/\/+$/, '');
  return `https://www.instagram.com/${handle}/`;
}

/** Normalize TikTok profile URL from a full URL or @handle. */
export function normalizeTiktokUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const handle = trimmed.replace(/^@/, '').replace(/^\/+/, '');
  return `https://www.tiktok.com/@${handle}`;
}

export function resolveSocialUrl(
  platform: 'facebook' | 'instagram' | 'tiktok',
  raw?: string
): string {
  if (!raw?.trim()) return '';
  switch (platform) {
    case 'facebook':
      return normalizeFacebookUrl(raw);
    case 'instagram':
      return normalizeInstagramUrl(raw);
    case 'tiktok':
      return normalizeTiktokUrl(raw);
    default:
      return raw.trim();
  }
}
