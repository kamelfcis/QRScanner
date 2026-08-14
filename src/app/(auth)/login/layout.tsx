import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { fetchRestaurantSettings } from '@/lib/settings/fetchRestaurantSettings';

export async function generateMetadata(): Promise<Metadata> {
  const restaurant = await fetchRestaurantSettings();
  const nameAr = restaurant?.name_ar?.trim();
  const nameEn = restaurant?.name_en?.trim();
  const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim();
  const displayName = nameAr || nameEn || appName || 'لوحة التحكم';
  const title = `${displayName} | لوحة التحكم`;

  return {
    title,
    description: `تسجيل الدخول إلى لوحة تحكم ${displayName}`,
  };
}

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
