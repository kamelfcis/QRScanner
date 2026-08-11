import type { Metadata } from 'next';
import { defaultLocale, type Locale } from '@/i18n/config';

const SITE_NAME = 'Harameen Wholesale Market';
const SITE_NAME_AR = 'سوق الجملة شركة الحرمين';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://harameen.vercel.app';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

const DESCRIPTIONS = {
  en: 'Harameen Wholesale Market — Your trusted wholesale supermarket. Browse our digital catalog and order via WhatsApp.',
  ar: 'سوق الجملة شركة الحرمين — سوق جملة موثوق. تصفح كتالوجنا الرقمي واطلب عبر واتساب.',
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
      'supermarket',
      'wholesale',
      'grocery',
      'Egypt',
      'Harameen',
      'سوق الجملة شركة الحرمين',
      'digital menu',
      'QR menu',
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
      creator: '@harameen',
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
          ? 'استكشف أقسام سوق الجملة شركة الحرمين. تصفح كتالوجنا الكامل للمنتجات.'
          : 'Explore Harameen Wholesale Market categories. Browse our full product catalog.',
      openGraph: {
        title: locale === 'ar' ? `القائمة | ${SITE_NAME_AR}` : `Menu | ${SITE_NAME}`,
        description:
          locale === 'ar'
            ? `استكشف أقسام ${SITE_NAME_AR}.`
            : 'Explore the full catalog at Harameen Wholesale Market.',
        images: [{ url: '/og-menu.png', width: 1200, height: 630, alt: 'Harameen Menu' }],
      },
    },
    locale
  );
}

export function buildLocaleMetadata(locale: Locale = defaultLocale): Metadata {
  return generateSiteMetadata(undefined, locale);
}
