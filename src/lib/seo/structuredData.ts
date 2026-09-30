import type { RestaurantSettings } from '@/types/database';
import { defaultLocale, type Locale } from '@/i18n/config';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://wardashamya.com';
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Store';

export function generateRestaurantSchema(
  settings?: RestaurantSettings | null,
  locale: Locale = defaultLocale
) {
  const name = locale === 'ar' ? settings?.name_ar || APP_NAME : settings?.name_en || APP_NAME;

  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: settings?.name_en || APP_NAME,
    alternateName: settings?.name_ar || APP_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description:
      locale === 'ar'
        ? 'متجر محافظ وإكسسوارات فاخرة — جودة عالية وتصميم أنيق.'
        : 'Premium wallets and accessories store — luxury quality, timeless design.',
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
    hasOfferCatalog: `${SITE_URL}/welcome`,
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
    '@type': 'OfferCatalog',
    name: locale === 'ar' ? `منتجات ${APP_NAME}` : `${APP_NAME} Products`,
    description:
      locale === 'ar'
        ? 'مجموعة محافظ وإكسسوارات فاخرة.'
        : 'Premium wallets and accessories collection.',
    url: `${SITE_URL}/welcome`,
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
