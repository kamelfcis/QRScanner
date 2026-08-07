import type { Metadata } from 'next';
import { defaultLocale, type Locale } from '@/i18n/config';

const SITE_NAME = 'Warda Shamya';
const SITE_NAME_AR = 'وردة الشامية';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://wardashamya.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

const DESCRIPTIONS = {
  en: 'Warda Shamya — Premium Lebanese & Syrian restaurant in Riyadh. Explore our authentic menu with traditional dishes crafted with love.',
  ar: 'وردة الشامية — مطعم لبناني وسوري فاخر في الرياض. استكشف قائمتنا الأصيلة بأطباق تقليدية مُعدّة بحب.',
} as const;

export function generateSiteMetadata(
  overrides?: Partial<Metadata>,
  locale: Locale = defaultLocale
): Metadata {
  const siteName = locale === 'ar' ? SITE_NAME_AR : SITE_NAME;
  const description = DESCRIPTIONS[locale];

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description,
    keywords: [
      'restaurant',
      'Lebanese food',
      'Syrian food',
      'Riyadh',
      'Warda Shamya',
      'وردة الشامية',
      'Middle Eastern cuisine',
      'halal restaurant',
    ],
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    formatDetection: {
      telephone: true,
      email: true,
      address: true,
    },
    openGraph: {
      type: 'website',
      locale: locale === 'ar' ? 'ar_SA' : 'en_US',
      alternateLocale: locale === 'ar' ? ['en_US'] : ['ar_SA'],
      url: SITE_URL,
      siteName,
      title: siteName,
      description,
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: siteName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: siteName,
      description,
      images: [DEFAULT_OG_IMAGE],
      creator: '@wardashamya',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: SITE_URL,
      languages: {
        en: SITE_URL,
        ar: SITE_URL,
        'x-default': SITE_URL,
      },
    },
    ...overrides,
  };
}

export function generateMenuMetadata(locale: Locale = defaultLocale): Metadata {
  return generateSiteMetadata(
    {
      title: locale === 'ar' ? 'القائمة' : 'Menu',
      description:
        locale === 'ar'
          ? 'استكشف نكهات وردة الشامية الأصيلة. تصفح قائمتنا الكاملة.'
          : 'Explore the authentic flavors of Warda Shamya. Browse our complete menu featuring traditional Lebanese and Syrian dishes.',
      openGraph: {
        title: locale === 'ar' ? `القائمة | ${SITE_NAME_AR}` : `Menu | ${SITE_NAME}`,
        description:
          locale === 'ar'
            ? 'استكشف نكهات وردة الشامية الأصيلة.'
            : 'Explore the authentic flavors of Warda Shamya.',
        images: [{ url: '/og-menu.png', width: 1200, height: 630, alt: 'Warda Shamya Menu' }],
      },
    },
    locale
  );
}

export function buildLocaleMetadata(locale: Locale = defaultLocale): Metadata {
  return generateSiteMetadata(undefined, locale);
}
