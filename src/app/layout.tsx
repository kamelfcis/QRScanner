import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, DM_Sans, Tajawal } from 'next/font/google';
import { headers } from 'next/headers';
import { TooltipProvider } from '@/components/ui/tooltip';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { OfflineIndicator } from '@/components/pwa/OfflineIndicator';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RootI18nProvider } from '@/components/providers/RootI18nProvider';
import { getThemeSettings } from '@/lib/supabase/server';
import { themeToCssText } from '@/lib/theme';
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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aklet-gambary.example.com';

const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Aklet Gambary | Digital Restaurant Menu',
    template: '%s | Aklet Gambary',
  },
  description:
    'Aklet Gambary Restaurant - Premium dining experience with digital menu. Scan QR code to view our menu.',
  keywords: [
    'restaurant',
    'menu',
    'QR code',
    'seafood',
    'dining',
    'food',
    'Aklet Gambary',
    'أكلة جمبري أنا',
  ],
  authors: [{ name: 'Aklet Gambary' }],
  creator: 'Aklet Gambary',
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
    siteName: 'Aklet Gambary',
    title: 'Aklet Gambary | Digital Restaurant Menu',
    description: 'Premium dining experience with digital menu.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Aklet Gambary',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aklet Gambary | Digital Restaurant Menu',
    description: 'Premium dining experience with digital menu.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export function generateMetadata(): Metadata {
  return baseMetadata;
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F0FDFA' },
    { media: '(prefers-color-scheme: dark)', color: '#0A1012' },
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
  const brandThemeCss = themeToCssText(await getThemeSettings(), 'light');

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${dmSans.variable} ${cormorant.variable} ${tajawal.variable} h-full w-full overflow-x-clip antialiased`}
      suppressHydrationWarning
    >
      <head>
        <style id="brand-theme-vars" dangerouslySetInnerHTML={{ __html: brandThemeCss }} />
        <link rel="manifest" href="/manifest.json" />
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
              <InstallPrompt />
              <OfflineIndicator />
            </TooltipProvider>
          </RootI18nProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
