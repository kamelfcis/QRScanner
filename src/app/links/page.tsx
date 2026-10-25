import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { showLinkPage } from '@/lib/tenant-config';
import { fetchRestaurantSettings } from '@/lib/settings/fetchRestaurantSettings';
import { LinksPageClient } from './LinksPageClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://makhboz.engazqr.com';

export async function generateMetadata(): Promise<Metadata> {
  const restaurant = await fetchRestaurantSettings();
  const logo = restaurant?.logo_url || `${SITE_URL}/logo.png`;

  return {
    title: 'مخبوز | Links',
    description: 'مخبوز — browse the menu and get in touch.',
    openGraph: {
      title: 'مخبوز | Links',
      description: 'مخبوز — browse the menu and get in touch.',
      url: `${SITE_URL}/links`,
      images: [{ url: logo }],
    },
  };
}

export default function LinksPage() {
  if (!showLinkPage) notFound();
  return <LinksPageClient />;
}
