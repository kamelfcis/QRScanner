import type { Metadata } from 'next';
import { DM_Sans, IBM_Plex_Sans } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const body = DM_Sans({
  variable: '--font-body-family',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const heading = IBM_Plex_Sans({
  variable: '--font-heading-family',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

export const metadata: Metadata = {
  title: {
    default: 'Engaz Admin',
    template: '%s | Engaz Admin',
  },
  description: 'Engaz customer provisioning control plane',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable} h-full`}>
      <body className="min-h-full font-sans">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
