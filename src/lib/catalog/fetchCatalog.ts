import type { SupabaseClient } from '@supabase/supabase-js';
import type { CategoryWithProducts } from '@/types';
import { CATALOG_WITH_PRODUCTS_SELECT } from './keys';

export async function fetchCategoriesWithProducts(
  supabase: SupabaseClient
): Promise<CategoryWithProducts[]> {
  const { data, error } = await supabase
    .from('categories')
    .select(CATALOG_WITH_PRODUCTS_SELECT)
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  type RawCategory = CategoryWithProducts & {
    products?: CategoryWithProducts['products'];
    subcategories?: NonNullable<CategoryWithProducts['subcategories']>;
  };

  return ((data || []) as unknown as RawCategory[]).map((category) => ({
    ...category,
    products: ((category.products || []) as CategoryWithProducts['products'])
      .filter((p) => p.is_available)
      .sort((a, b) => a.sort_order - b.sort_order),
    subcategories: (
      (category.subcategories || []) as NonNullable<CategoryWithProducts['subcategories']>
    ).sort((a, b) => a.sort_order - b.sort_order),
  })) as unknown as CategoryWithProducts[];
}
