/** Default full-bleed hero when no custom cover is uploaded in settings. */
export const DEFAULT_HERO =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=2400&q=80';

export function getHeroImageUrl(heroImageUrl?: string | null): string {
  return heroImageUrl || DEFAULT_HERO;
}
