import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { fetchCategoriesWithProducts } from '@/lib/catalog/fetchCatalog';
import { categoryKeys, CATALOG_STALE_TIME, CATALOG_GC_TIME } from '@/lib/catalog/keys';
import { settingsKeys } from '@/lib/settings/keys';
import { MenuPageClient } from '@/components/menu/MenuPageClient';
import { MenuSettingsProvider } from '@/components/menu/MenuSettingsProvider';
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

  let initialRestaurantSettings: RestaurantSettings | null = null;

  try {
    const supabase = await createClient();
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: categoryKeys.withProducts(),
        queryFn: () => fetchCategoriesWithProducts(supabase),
      }),
      // Match client useRestaurantSettings queryFn so currency hydrates on first paint.
      queryClient.prefetchQuery({
        queryKey: settingsKeys.restaurant(),
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
    initialRestaurantSettings =
      queryClient.getQueryData<RestaurantSettings>(settingsKeys.restaurant()) ?? null;
  } catch {
    // Prefetch is best-effort; client will retry
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MenuSettingsProvider initialSettings={initialRestaurantSettings}>
        <MenuPageClient />
      </MenuSettingsProvider>
    </HydrationBoundary>
  );
}
