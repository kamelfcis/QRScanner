import type { Metadata } from 'next';
import { defaultLocale, type Locale } from '@/i18n/config';

const SITE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'مخبوز';
const SITE_NAME_AR = process.env.NEXT_PUBLIC_APP_NAME_AR || 'مخبوز';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://makhboz.engazqr.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

type LiveSiteName = {
  name_en?: string | null;
  name_ar?: string | null;
} | null;

function liveSiteName(locale: Locale, settings?: LiveSiteName): string {
  const nameEn = settings?.name_en?.trim() || '';
  const nameAr = settings?.name_ar?.trim() || '';
  const fromSettings = locale === 'ar' ? nameAr || nameEn : nameEn || nameAr;
  if (fromSettings) return fromSettings;
  return locale === 'ar' ? SITE_NAME_AR : SITE_NAME;
}

export function generateSiteMetadata(
  overrides?: Partial<Metadata>,
  locale: Locale = defaultLocale,
  settings?: LiveSiteName
): Metadata {
  const siteName = liveSiteName(locale, settings);
  const description =
    locale === 'ar'
      ? `${siteName} — تصفّح القائمة واطلب أونلاين.`
      : `${siteName} — Browse the menu and order online.`;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description,
    keywords: ['bakery', 'menu', 'restaurant', siteName],
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
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

export function generateMenuMetadata(
  locale: Locale = defaultLocale,
  settings?: LiveSiteName
): Metadata {
  const nameEn = settings?.name_en?.trim() || liveSiteName('en', settings);
  const nameAr = settings?.name_ar?.trim() || liveSiteName('ar', settings);
  const displayName = locale === 'ar' ? nameAr : nameEn;

  return generateSiteMetadata(
    {
      title: locale === 'ar' ? 'القائمة' : 'Menu',
      description:
        locale === 'ar'
          ? `تصفّح قائمة ${nameAr} واطلب أونلاين.`
          : `Browse the ${nameEn} menu and order online.`,
      openGraph: {
        title: locale === 'ar' ? `القائمة | ${nameAr}` : `Menu | ${nameEn}`,
        description:
          locale === 'ar'
            ? `تصفّح قائمة ${nameAr}.`
            : `Browse the ${nameEn} menu.`,
        images: [{ url: '/og-menu.png', width: 1200, height: 630, alt: displayName }],
      },
    },
    locale,
    settings
  );
}

export function buildLocaleMetadata(locale: Locale = defaultLocale): Metadata {
  return generateSiteMetadata(undefined, locale);
}
