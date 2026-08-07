import type { Metadata } from 'next';
import { defaultLocale, type Locale } from '@/i18n/config';

const SITE_NAME = 'Aklet Gambary';
const SITE_NAME_AR = 'أكلة جمبري أنا';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aklet-gambary.example.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

const DESCRIPTIONS = {
  en: 'Aklet Gambary — Seafood restaurant. Explore our digital menu and order via WhatsApp.',
  ar: 'أكلة جمبري أنا — مطعم مأكولات بحرية. تصفح قائمتنا الرقمية واطلب عبر واتساب.',
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
      'seafood',
      'Egypt',
      'Aklet Gambary',
      'أكلة جمبري أنا',
      'digital menu',
      'QR menu',
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
      locale: locale === 'ar' ? 'ar_EG' : 'en_US',
      alternateLocale: locale === 'ar' ? ['en_US'] : ['ar_EG'],
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
      creator: '@akletgambary',
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
          ? 'استكشف نكهات أكلة جمبري أنا. تصفح قائمتنا الكاملة لمأكولات البحر.'
          : 'Explore the flavors of Aklet Gambary. Browse our complete seafood menu.',
      openGraph: {
        title: locale === 'ar' ? `القائمة | ${SITE_NAME_AR}` : `Menu | ${SITE_NAME}`,
        description:
          locale === 'ar'
            ? `استكشف نكهات ${SITE_NAME_AR}.`
            : 'Explore the authentic flavors of Aklet Gambary.',
        images: [{ url: '/og-menu.png', width: 1200, height: 630, alt: 'Aklet Gambary Menu' }],
      },
    },
    locale
  );
}

export function buildLocaleMetadata(locale: Locale = defaultLocale): Metadata {
  return generateSiteMetadata(undefined, locale);
}
