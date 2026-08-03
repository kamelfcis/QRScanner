import type { RestaurantSettings } from '@/types/database';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://wardashamya.com';

export function generateRestaurantSchema(settings?: RestaurantSettings | null) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: settings?.name_en || 'Warda Shamya',
    alternateName: settings?.name_ar || 'وردة الشامية',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: 'Premium Lebanese & Syrian restaurant in Riyadh, Saudi Arabia.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Riyadh',
      addressCountry: 'SA',
      streetAddress: settings?.address_en || '',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 24.7136,
      longitude: 46.6753,
    },
    telephone: settings?.phone || '',
    email: 'info@wardashamya.com',
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday'],
        opens: '09:00',
        closes: '23:00',
      },
    ],
    priceRange: '$$',
    servesCuisine: ['Lebanese', 'Syrian', 'Middle Eastern'],
    hasMenu: `${SITE_URL}/menu`,
    acceptsReservations: false,
    sameAs: [
      settings?.instagram && `https://instagram.com/${settings.instagram}`,
      settings?.facebook && `https://facebook.com/${settings.facebook}`,
      settings?.tiktok && `https://tiktok.com/@${settings.tiktok}`,
    ].filter(Boolean),
  };
}

export function generateMenuSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    name: 'Warda Shamya Menu',
    description: 'Authentic Lebanese and Syrian cuisine menu.',
    url: `${SITE_URL}/menu`,
    inLanguage: ['en', 'ar'],
    hasMenuSection: [],
  };
}

export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}