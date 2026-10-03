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
import { ServerBrandThemeStyles } from '@/components/providers/ServerBrandThemeStyles';
import { fetchRestaurantSettings } from '@/lib/settings/fetchRestaurantSettings';
import { defaultLocale, type Locale } from '@/i18n/config';
import { isOstolSite, THEME_STORAGE_KEY } from '@/lib/tenant-config';
import './globals.css';

const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var r=document.documentElement;if(t==='light')r.classList.remove('dark');else r.classList.add('dark');}catch(e){}})();`;

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
  const title = `${siteNameEn} | Premium Wallets & Accessories`;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s | ${siteNameEn}`,
    },
    description: `${siteNameEn} — Premium wallets and accessories. Browse our collection and shop online.`,
    keywords: ['wallets', 'accessories', 'luxury', 'shop', 'e-commerce', siteNameEn, siteNameAr],
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
      locale: 'en_US',
      alternateLocale: ['ar_SA'],
      url: SITE_URL,
      siteName: siteNameEn,
      title,
      description: 'Premium wallets and accessories — browse and shop online.',
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
      description: 'Premium wallets and accessories — browse and shop online.',
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
    { media: '(prefers-color-scheme: light)', color: '#0A1628' },
    { media: '(prefers-color-scheme: dark)', color: '#0A1628' },
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
      className={`dark ${dmSans.variable} ${cormorant.variable} ${tajawal.variable} ${plexArabic.variable} h-full w-full overflow-x-clip antialiased`}
      data-site={isOstolSite ? 'ostol' : undefined}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <meta name="mobile-web-app-capable" content="yes" />
        <ServerBrandThemeStyles />
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
            <QueryProvider>
              <TooltipProvider delay={0}>
                {children}
                <InstallPrompt />
                <OfflineIndicator />
              </TooltipProvider>
            </QueryProvider>
          </RootI18nProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
