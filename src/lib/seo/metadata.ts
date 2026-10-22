import type { Metadata } from 'next';
import { defaultLocale, type Locale } from '@/i18n/config';

const SITE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'AlTounsi Store';
const SITE_NAME_AR = process.env.NEXT_PUBLIC_APP_NAME_AR || 'التونسي ستور';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://altounsi-store.engazqr.com';
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
      creator: '@altounsistore',
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
        locale === 'ar' ? `تصفح منتجات ${SITE_NAME_AR}.` : `Browse the ${SITE_NAME} catalog.`,
      openGraph: {
        title: locale === 'ar' ? `القائمة | ${SITE_NAME_AR}` : `Menu | ${SITE_NAME}`,
        description:
          locale === 'ar' ? `تصفح منتجات ${SITE_NAME_AR}.` : `Browse the ${SITE_NAME} catalog.`,
        images: [{ url: '/og-menu.png', width: 1200, height: 630, alt: `${SITE_NAME} menu` }],
      },
    },
    locale
  );
}

export function buildLocaleMetadata(locale: Locale = defaultLocale): Metadata {
  return generateSiteMetadata(undefined, locale);
}
