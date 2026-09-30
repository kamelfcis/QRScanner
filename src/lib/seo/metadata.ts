import type { Metadata } from 'next';
import { defaultLocale, type Locale } from '@/i18n/config';

const SITE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'MAZEN STORE';
const SITE_NAME_AR = process.env.NEXT_PUBLIC_APP_NAME_AR || SITE_NAME;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mazen-store-b1eb.vercel.app';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

const DESCRIPTIONS = {
  en: `${SITE_NAME} — Premium wallets and accessories. Browse our collection and shop online.`,
  ar: `${SITE_NAME_AR} — محافظ وإكسسوارات فاخرة. تصفّح مجموعتنا وتسوّق أونلاين.`,
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
    keywords: ['wallets', 'accessories', 'luxury', 'shop', 'e-commerce', SITE_NAME, SITE_NAME_AR],
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
