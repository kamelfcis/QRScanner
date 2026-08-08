import type { MetadataRoute } from 'next';
import { getAppNameFallback, getRestaurantDisplayName } from '@/lib/appName';
import {
  fetchRestaurantSettings,
  fetchThemeSettings,
} from '@/lib/settings/fetchRestaurantSettings';

export const revalidate = 300;

function buildManifestIcons(): MetadataRoute.Manifest['icons'] {
  return [
    {
      src: '/icon',
      sizes: '32x32',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/apple-icon',
      sizes: '180x180',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/apple-icon',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/apple-icon',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ];
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [settings, theme] = await Promise.all([fetchRestaurantSettings(), fetchThemeSettings()]);

  const appName = getAppNameFallback();
  const displayName = getRestaurantDisplayName('en', settings);
  const shortName = displayName.length > 12 ? appName : displayName;

  return {
    name: `${displayName} - Restaurant`,
    short_name: shortName,
    description: `${displayName} - Digital restaurant menu. Browse dishes, view offers, and order online.`,
    start_url: '/',
    display: 'standalone',
    background_color: theme.background_color,
    theme_color: theme.primary_color,
    orientation: 'portrait-primary',
    categories: ['food', 'restaurant', 'business'],
    lang: 'en',
    dir: 'ltr',
    icons: buildManifestIcons(),
  };
}
