import type { SupabaseClient } from '@supabase/supabase-js';
import { isEcommerceStore } from '@/lib/store-config';
import type { Product } from '@/types';
import { POPULAR_PRODUCTS_SELECT } from './keys';
import type { ProductGallerySlideInput } from './product-slides';

export type PopularProduct = Product & {
  gallery: ProductGallerySlideInput[] | null;
};

export async function fetchPopularProducts(supabase: SupabaseClient): Promise<PopularProduct[]> {
  let query = supabase.from('products').select(POPULAR_PRODUCTS_SELECT).eq('is_popular', true);

  if (!isEcommerceStore) {
    query = query.eq('is_available', true);
  }

  const { data, error } = await query
    .order('sort_order', { ascending: true })
    .order('sort_order', { ascending: true, referencedTable: 'product_gallery' })
    .limit(12);

  if (error) throw error;
  return (data ?? []) as PopularProduct[];
}
