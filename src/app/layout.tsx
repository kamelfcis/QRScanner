import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, DM_Sans, IBM_Plex_Sans_Arabic, Tajawal } from 'next/font/google';
import { headers } from 'next/headers';
import { TooltipProvider } from '@/components/ui/tooltip';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { OfflineIndicator } from '@/components/pwa/OfflineIndicator';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RootI18nProvider } from '@/components/providers/RootI18nProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { getSiteNameEn, getSiteNameForLocale } from '@/lib/appName';
import { fetchRestaurantSettings } from '@/lib/settings/fetchRestaurantSettings';
import { defaultLocale, type Locale } from '@/i18n/config';
import './globals.css';

const dmSans = DM_Sans({
  variable: '--font-body-family',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: true,
});

const cormorant = Cormorant_Garamond({
  variable: '--font-heading-family',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
  preload: true,
});

const tajawal = Tajawal({
  variable: '--font-ar-family',
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  display: 'swap',
  preload: true,
});

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: '--font-ar-heading-family',
  subsets: ['arabic'],
  weight: ['500', '600', '700'],
  display: 'swap',
  preload: true,
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://wardashamya.com';

function buildRootMetadata(
  settings: Awaited<ReturnType<typeof fetchRestaurantSettings>>
): Metadata {
  const siteNameEn = getSiteNameEn(settings);
  const siteNameAr = getSiteNameForLocale('ar', settings);
  const title = `${siteNameEn} | Digital Restaurant Menu`;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s | ${siteNameEn}`,
    },
    description: `${siteNameEn} Restaurant - Premium dining experience with digital menu. Scan QR code to view our menu.`,
    keywords: ['restaurant', 'menu', 'QR code', 'dining', 'food', siteNameEn, siteNameAr],
    authors: [{ name: siteNameEn }],
    creator: siteNameEn,
    alternates: {
      languages: {
        en: SITE_URL,
        ar: SITE_URL,
        'x-default': SITE_URL,
      },
    },
    openGraph: {
      type: 'website',
      locale: 'ar_SA',
      alternateLocale: ['en_US'],
      url: SITE_URL,
      siteName: siteNameEn,
      title,
      description: 'Premium dining experience with digital menu.',
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: siteNameEn,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: 'Premium dining experience with digital menu.',
      images: ['/og-image.png'],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchRestaurantSettings();
  return buildRootMetadata(settings);
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF8F5' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const locale = (headerStore.get('x-locale') || defaultLocale) as Locale;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${dmSans.variable} ${cormorant.variable} ${tajawal.variable} ${plexArabic.variable} h-full w-full overflow-x-clip antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="flex min-h-full w-full flex-col overflow-x-clip">
        <a
          href="#main-content"
          className="focus:bg-background focus:text-foreground sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4"
        >
          Skip to main content
        </a>
        <ErrorBoundary>
          <RootI18nProvider initialLocale={locale}>
            <TooltipProvider delay={0}>
              {children}
              <QueryProvider>
                <InstallPrompt />
              </QueryProvider>
              <OfflineIndicator />
            </TooltipProvider>
          </RootI18nProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
