import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display, Noto_Sans_Arabic } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { OfflineIndicator } from '@/components/pwa/OfflineIndicator';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RootI18nProvider } from '@/components/providers/RootI18nProvider';
import './globals.css';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  variable: '--font-heading',
  subsets: ['latin'],
  display: 'swap',
});

const notoArabic = Noto_Sans_Arabic({
  variable: '--font-ar',
  subsets: ['arabic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Warda Shamya | Digital Restaurant Menu',
    template: '%s | Warda Shamya',
  },
  description:
    'Warda Shamya Restaurant - Premium dining experience with digital menu. Scan QR code to view our menu.',
  keywords: ['restaurant', 'menu', 'QR code', 'dining', 'food', 'Warda Shamya'],
  authors: [{ name: 'Warda Shamya' }],
  creator: 'Warda Shamya',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://wardashamya.com',
    siteName: 'Warda Shamya',
    title: 'Warda Shamya | Digital Restaurant Menu',
    description: 'Premium dining experience with digital menu.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Warda Shamya',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Warda Shamya | Digital Restaurant Menu',
    description: 'Premium dining experience with digital menu.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#B8860B' },
    { media: '(prefers-color-scheme: dark)', color: '#DAA520' },
  ],
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = 'en';
  const dir = 'ltr';

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${inter.variable} ${playfairDisplay.variable} ${notoArabic.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#B8860B" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-background focus:text-foreground">
          Skip to main content
        </a>
        <ErrorBoundary>
          <RootI18nProvider initialLocale={locale as 'en' | 'ar'}>
            <TooltipProvider delay={0}>{children}</TooltipProvider>
          </RootI18nProvider>
        </ErrorBoundary>
        <InstallPrompt />
        <OfflineIndicator />
      </body>
    </html>
  );
}
