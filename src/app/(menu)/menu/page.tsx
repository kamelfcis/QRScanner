import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { fetchCategoriesWithProducts } from '@/lib/catalog/fetchCatalog';
import { categoryKeys, CATALOG_STALE_TIME, CATALOG_GC_TIME } from '@/lib/catalog/keys';
import { settingsKeys } from '@/hooks/useSettings';
import { fetchRestaurantSettings } from '@/lib/settings/fetchRestaurantSettings';
import { MenuPageClient } from '@/components/menu/MenuPageClient';
import { defaultLocale, type Locale } from '@/i18n/config';
import { generateMenuMetadata } from '@/lib/seo/metadata';

export async function generateMetadata() {
  const headerStore = await headers();
  const locale = (headerStore.get('x-locale') || defaultLocale) as Locale;
  return await generateMenuMetadata(locale);
}

export default async function PublicMenuPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: CATALOG_STALE_TIME,
        gcTime: CATALOG_GC_TIME,
      },
    },
  });

  try {
    const supabase = await createClient();
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: categoryKeys.withProducts(),
        queryFn: () => fetchCategoriesWithProducts(supabase),
      }),
      queryClient.prefetchQuery({
        queryKey: settingsKeys.restaurant(),
        queryFn: async () => {
          const settings = await fetchRestaurantSettings();
          if (!settings) throw new Error('Restaurant settings unavailable');
          return settings;
        },
      }),
    ]);
  } catch {
    // Prefetch is best-effort; client will retry
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MenuPageClient />
    </HydrationBoundary>
  );
}
