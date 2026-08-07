import { QueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Gallery, Product, RestaurantSettings, Settings, ThemeSettings } from '@/types';
import { CATALOG_GC_TIME, CATALOG_STALE_TIME } from './keys';

/** Must match hooks/useSettings settingsKeys.restaurant() */
const restaurantSettingsKey = ['settings', 'restaurant'] as const;
/** Must match hooks/useSettings settingsKeys.theme() */
const themeSettingsKey = ['settings', 'theme'] as const;
/** Must match hooks/useGallery galleryKeys.visible() */
const visibleGalleryKey = ['gallery', 'visible'] as const;
/** Must match hooks/useProducts productKeys.popular() */
const popularProductsKey = ['products', 'popular'] as const;

export async function prefetchLandingData(supabase: SupabaseClient, queryClient: QueryClient) {
  await Promise.all([
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
    }),
    queryClient.prefetchQuery({
      queryKey: popularProductsKey,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('products')
          .select(
            'id, category_id, subcategory_id, name_ar, name_en, description_ar, description_en, image_url, dining_price, takeaway_price, is_available, is_popular, is_new, is_bestseller, is_spicy, sort_order, created_at, updated_at'
          )
          .eq('is_available', true)
          .eq('is_popular', true)
          .order('sort_order', { ascending: true })
          .limit(12);
        if (error) throw error;
        return data as Product[];
      },
      staleTime: CATALOG_STALE_TIME,
      gcTime: CATALOG_GC_TIME,
    }),
  ]);
}
