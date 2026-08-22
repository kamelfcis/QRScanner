import { QueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Gallery, Product, RestaurantSettings, Settings, ThemeSettings } from '@/types';
import { showLandingFeaturedDishes, showLandingGallery } from '@/i18n/config';
import { CATALOG_GC_TIME, CATALOG_STALE_TIME, popularProductFields } from './keys';

/** Must match hooks/useSettings settingsKeys.restaurant() */
const restaurantSettingsKey = ['settings', 'restaurant'] as const;
/** Must match hooks/useSettings settingsKeys.theme() */
const themeSettingsKey = ['settings', 'theme'] as const;
/** Must match hooks/useGallery galleryKeys.visible() */
const visibleGalleryKey = ['gallery', 'visible'] as const;
/** Must match hooks/useProducts productKeys.popular() */
const popularProductsKey = ['products', 'popular'] as const;

export async function prefetchLandingData(supabase: SupabaseClient, queryClient: QueryClient) {
  const prefetches = [
    queryClient.prefetchQuery({
      queryKey: restaurantSettingsKey,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('key', 'restaurant')
          .single();
        if (error) throw error;
        return (data as Settings).value as unknown as RestaurantSettings;
      },
      staleTime: CATALOG_STALE_TIME,
      gcTime: CATALOG_GC_TIME,
    }),
    queryClient.prefetchQuery({
      queryKey: themeSettingsKey,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('key', 'theme')
          .single();
        if (error) throw error;
        return (data as Settings).value as unknown as ThemeSettings;
      },
      staleTime: CATALOG_STALE_TIME,
      gcTime: CATALOG_GC_TIME,
    }),
  ];

  if (showLandingGallery) {
    prefetches.push(
      queryClient.prefetchQuery({
        queryKey: visibleGalleryKey,
        queryFn: async () => {
          const { data, error } = await supabase
            .from('gallery')
            .select('id, image_url, caption_ar, caption_en, is_featured, sort_order, is_visible')
            .eq('is_visible', true)
            .order('sort_order', { ascending: true });
          if (error) throw error;
          return data as Gallery[];
        },
        staleTime: CATALOG_STALE_TIME,
        gcTime: CATALOG_GC_TIME,
      })
    );
  }

  if (showLandingFeaturedDishes) {
    prefetches.push(
      queryClient.prefetchQuery({
        queryKey: popularProductsKey,
        queryFn: async () => {
          const { data, error } = await supabase
            .from('products')
            .select(popularProductFields)
            .eq('is_available', true)
            .eq('is_popular', true)
            .order('sort_order', { ascending: true })
            .limit(12);
          if (error) throw error;
          return data as unknown as Product[];
        },
        staleTime: CATALOG_STALE_TIME,
        gcTime: CATALOG_GC_TIME,
      })
    );
  }

  await Promise.all(prefetches);
}
