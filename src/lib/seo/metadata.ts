import type { Metadata } from 'next';

const SITE_NAME = 'Warda Shamya';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://wardashamya.com';
const DEFAULT_DESCRIPTION = 'Warda Shamya - Premium Lebanese & Syrian restaurant in Riyadh. Explore our authentic menu with traditional dishes crafted with love.';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

export function generateSiteMetadata(overrides?: Partial<Metadata>): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`,
    },
    description: DEFAULT_DESCRIPTION,
    keywords: ['restaurant', 'Lebanese food', 'Syrian food', 'Riyadh', 'Warda Shamya', 'Middle Eastern cuisine', 'halal restaurant'],
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
      locale: 'en_US',
      url: SITE_URL,
      siteName: SITE_NAME,
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
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
    },
    ...overrides,
  };
}

export function generateMenuMetadata(): Metadata {
  return generateSiteMetadata({
    title: 'Menu',
    description: 'Explore the authentic flavors of Warda Shamya. Browse our complete menu featuring traditional Lebanese and Syrian dishes, appetizers, main courses, beverages, and desserts.',
    openGraph: {
      title: `Menu | ${SITE_NAME}`,
      description: 'Explore the authentic flavors of Warda Shamya.',
      images: [{ url: '/og-menu.png', width: 1200, height: 630, alt: 'Warda Shamya Menu' }],
    },
    twitter: {
      title: `Menu | ${SITE_NAME}`,
      description: 'Explore the authentic flavors of Warda Shamya.',
    },
  });
}