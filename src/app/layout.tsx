import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import { Toaster } from 'sonner';
import { I18nProvider } from '@/lib/i18n';
import './globals.css';

const cairo = Cairo({
  variable: '--font-body-family',
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://engaz.vercel.app'),
  title: {
    default: 'Engaz — QR Menu for Restaurants & Cafés',
    template: '%s | Engaz',
  },
  description:
    'Digital QR menus for restaurants and cafés. Bilingual Arabic/English, WhatsApp ordering, analytics, and AI menu import. By ILC Soft.',
  applicationName: 'Engaz',
  keywords: ['QR menu', 'restaurant', 'café', 'WhatsApp ordering', 'Arabic', 'RTL', 'Engaz'],
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Engaz — QR Menu for Restaurants & Cafés',
    description:
      'Guests scan a QR, browse a bilingual menu, and order on WhatsApp. Analytics and AI import included.',
    type: 'website',
    locale: 'ar_EG',
    alternateLocale: ['en_US'],
    images: [{ url: '/og.png', width: 1024, height: 1024, alt: 'Engaz QR Menu' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Engaz — QR Menu for Restaurants & Cafés',
    description: 'Bilingual QR menus, WhatsApp ordering, and analytics. By ILC Soft.',
    images: ['/og.png'],
  },
  icons: {
    icon: '/brand/engaz-hero.png',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full`}>
      <body className={`${cairo.className} min-h-full font-sans`}>
        <I18nProvider>{children}</I18nProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
