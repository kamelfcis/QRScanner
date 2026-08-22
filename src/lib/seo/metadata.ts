import type { Metadata } from 'next';
import { getSiteNameAr, getSiteNameEn, getSiteNameForLocale } from '@/lib/appName';
import { fetchRestaurantSettings } from '@/lib/settings/fetchRestaurantSettings';
import { defaultLocale, enabledLocales, type Locale } from '@/i18n/config';
import type { RestaurantSettings } from '@/types/database';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://wardashamya.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

const OPEN_GRAPH_LOCALES: Record<Locale, string> = {
  ar: 'ar_SA',
  en: 'en_US',
  fr: 'fr_FR',
  nl: 'nl_NL',
};

const DESCRIPTIONS: Record<Locale, (siteName: string) => string> = {
  en: (siteName) =>
    `${siteName} — Premium Lebanese & Syrian restaurant in Riyadh. Explore our authentic menu with traditional dishes crafted with love.`,
  ar: (siteName) =>
    `${siteName} — مطعم لبناني وسوري فاخر في الرياض. استكشف قائمتنا الأصيلة بأطباق تقليدية مُعدّة بحب.`,
  fr: (siteName) =>
    `${siteName} — Restaurant libanais et syrien premium à Riyad. Découvrez notre menu authentique avec des plats traditionnels préparés avec amour.`,
  nl: (siteName) =>
    `${siteName} — Premium Libanees en Syrisch restaurant in Riyad. Ontdek ons authentieke menu met traditionele gerechten bereid met liefde.`,
};

function getAlternateOpenGraphLocales(locale: Locale): string[] {
  return enabledLocales.filter((l) => l !== locale).map((l) => OPEN_GRAPH_LOCALES[l]);
}

function buildLanguageAlternates(): Record<string, string> {
  const languages: Record<string, string> = { 'x-default': SITE_URL };
  for (const locale of enabledLocales) {
    languages[locale] = SITE_URL;
  }
  return languages;
}

export function generateSiteMetadata(
  overrides?: Partial<Metadata>,
  locale: Locale = defaultLocale,
  settings?: RestaurantSettings | null
): Metadata {
  const siteNameEn = getSiteNameEn(settings);
  const siteNameAr = getSiteNameAr(settings);
  const siteName = getSiteNameForLocale(locale, settings);
  const description = DESCRIPTIONS[locale](siteName);

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
      siteNameEn,
      siteNameAr,
      'Middle Eastern cuisine',
      'halal restaurant',
    ],
    authors: [{ name: siteNameEn }],
    creator: siteNameEn,
    publisher: siteNameEn,
    formatDetection: {
      telephone: true,
      email: true,
      address: true,
    },
    openGraph: {
      type: 'website',
      locale: OPEN_GRAPH_LOCALES[locale],
      alternateLocale: getAlternateOpenGraphLocales(locale),
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
      languages: buildLanguageAlternates(),
    },
    ...overrides,
  };
}

const MENU_TITLES: Record<Locale, string> = {
  ar: 'القائمة',
  en: 'Menu',
  fr: 'Menu',
  nl: 'Menu',
};

function menuDescriptions(siteName: string): Record<Locale, string> {
  return {
    ar: `استكشف نكهات ${siteName} الأصيلة. تصفح قائمتنا الكاملة.`,
    en: `Explore the authentic flavors of ${siteName}. Browse our complete menu featuring traditional Lebanese and Syrian dishes.`,
    fr: `Découvrez les saveurs authentiques de ${siteName}. Parcourez notre menu complet.`,
    nl: `Ontdek de authentieke smaken van ${siteName}. Bekijk ons volledige menu.`,
  };
}

function menuOgDescriptions(siteName: string): Record<Locale, string> {
  return {
    ar: `استكشف نكهات ${siteName} الأصيلة.`,
    en: `Explore the authentic flavors of ${siteName}.`,
    fr: `Découvrez les saveurs authentiques de ${siteName}.`,
    nl: `Ontdek de authentieke smaken van ${siteName}.`,
  };
}

export async function generateMenuMetadata(locale: Locale = defaultLocale): Promise<Metadata> {
  const settings = await fetchRestaurantSettings();
  const menuTitle = MENU_TITLES[locale];
  const siteName = getSiteNameForLocale(locale, settings);
  const siteNameEn = getSiteNameEn(settings);
  const descriptions = menuDescriptions(siteName);
  const ogDescriptions = menuOgDescriptions(siteName);

  return generateSiteMetadata(
    {
      title: menuTitle,
      description: descriptions[locale],
      openGraph: {
        title: `${menuTitle} | ${siteName}`,
        description: ogDescriptions[locale],
        images: [{ url: '/og-menu.png', width: 1200, height: 630, alt: `${siteNameEn} Menu` }],
      },
    },
    locale,
    settings
  );
}

export async function buildLocaleMetadata(locale: Locale = defaultLocale): Promise<Metadata> {
  const settings = await fetchRestaurantSettings();
  return generateSiteMetadata(undefined, locale, settings);
}
