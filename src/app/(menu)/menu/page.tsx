import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { fetchCategoriesWithProducts } from '@/lib/catalog/fetchCatalog';
import { categoryKeys, CATALOG_STALE_TIME, CATALOG_GC_TIME } from '@/lib/catalog/keys';
import { MenuPageClient } from '@/components/menu/MenuPageClient';
import { defaultLocale, type Locale } from '@/i18n/config';
import { generateMenuMetadata } from '@/lib/seo/metadata';
import type { RestaurantSettings, Settings } from '@/types';

export async function generateMetadata() {
  const headerStore = await headers();
  const locale = (headerStore.get('x-locale') || defaultLocale) as Locale;
  return generateMenuMetadata(locale);
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
    // Settings ride along with the catalogue so prices render with the right
    // currency on first paint instead of flashing the fallback.
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: categoryKeys.withProducts(),
        queryFn: () => fetchCategoriesWithProducts(supabase),
      }),
      queryClient.prefetchQuery({
        // Mirrors settingsKeys.restaurant() — inlined because that module is client-only.
        queryKey: ['settings', 'restaurant'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('settings')
            .select('*')
            .eq('key', 'restaurant')
            .single();
          if (error) throw error;
          return (data as Settings).value as unknown as RestaurantSettings;
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
