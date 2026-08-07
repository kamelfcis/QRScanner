import type { RestaurantSettings } from '@/types/database';
import { defaultLocale, type Locale } from '@/i18n/config';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://wardashamya.com';

export function generateRestaurantSchema(
  settings?: RestaurantSettings | null,
  locale: Locale = defaultLocale
) {
  const name =
    locale === 'ar' ? settings?.name_ar || 'وردة الشامية' : settings?.name_en || 'Warda Shamya';

  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: settings?.name_en || 'Warda Shamya',
    alternateName: settings?.name_ar || 'وردة الشامية',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description:
      locale === 'ar'
        ? 'مطعم لبناني وسوري فاخر في الرياض، المملكة العربية السعودية.'
        : 'Premium Lebanese & Syrian restaurant in Riyadh, Saudi Arabia.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Riyadh',
      addressCountry: 'SA',
      streetAddress:
        locale === 'ar'
          ? settings?.address_ar || settings?.address_en || ''
          : settings?.address_en || settings?.address_ar || '',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 24.7136,
      longitude: 46.6753,
    },
    telephone: settings?.phone || '',
    email: settings?.email || 'info@wardashamya.com',
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
    inLanguage: [locale],
    sameAs: [
      settings?.instagram && `https://instagram.com/${settings.instagram}`,
      settings?.facebook && `https://facebook.com/${settings.facebook}`,
      settings?.tiktok && `https://tiktok.com/@${settings.tiktok}`,
    ].filter(Boolean),
    nameDisplay: name,
  };
}

export function generateMenuSchema(locale: Locale = defaultLocale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    name: locale === 'ar' ? 'قائمة وردة الشامية' : 'Warda Shamya Menu',
    description:
      locale === 'ar'
        ? 'قائمة المأكولات اللبنانية والسورية الأصيلة.'
        : 'Authentic Lebanese and Syrian cuisine menu.',
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
