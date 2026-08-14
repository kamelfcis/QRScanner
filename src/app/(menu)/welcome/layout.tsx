import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { fetchRestaurantSettings } from '@/lib/settings/fetchRestaurantSettings';

export async function generateMetadata(): Promise<Metadata> {
  const restaurant = await fetchRestaurantSettings();
  const nameAr = restaurant?.name_ar?.trim();
  const nameEn = restaurant?.name_en?.trim();
  const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim();
  const displayName = nameAr || nameEn || appName || 'Restaurant';
  const title = `${displayName} | Welcome`;

  return {
    title: {
      absolute: title,
    },
    description: `Welcome to ${displayName}. Please choose dine-in or takeaway.`,
  };
}

export default function WelcomeLayout({ children }: { children: ReactNode }) {
  return children;
}
