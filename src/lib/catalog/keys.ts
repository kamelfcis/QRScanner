import type { ProductInput } from '@/types/schema';

export const categoryKeys = {
  all: ['categories'] as const,
  visible: () => [...categoryKeys.all, 'visible'] as const,
  allList: () => [...categoryKeys.all, 'allList'] as const,
  detail: (id: string) => [...categoryKeys.all, 'detail', id] as const,
  withProducts: () => [...categoryKeys.all, 'withProducts'] as const,
};

/** Narrow select for public menu catalog — avoids select('*') fan-out */
export const CATALOG_WITH_PRODUCTS_SELECT = `
  id, name_ar, name_en, description_ar, description_en, image_url, banner_url, sort_order, is_visible, created_at, updated_at,
  subcategories:subcategories!category_id(
    id, category_id, name_ar, name_en, description_ar, description_en, image_url, sort_order, is_visible, created_at, updated_at
  ),
  products:products!category_id(
    id, category_id, subcategory_id, name_ar, name_en, description_ar, description_en,
    image_url, dining_price, takeaway_price, is_available, is_popular, is_new, is_bestseller,
    is_spicy, sort_order, created_at, updated_at,
    product_sizes:product_sizes(
      id, product_id, sort_order, code, label_ar, label_en, price, is_enabled, is_sold_out
    ),
    gallery:product_gallery(id, product_id, image_url, sort_order, created_at)
  )
`;

export const PRODUCT_SIZES_EMBED =
  'product_sizes:product_sizes(id, product_id, sort_order, code, label_ar, label_en, price, is_enabled, is_sold_out)';

/** Omit null weight columns and form-only fields before insert/update. */
export function stripUnsupportedProductWriteFields(
  input: Partial<ProductInput>
): Partial<ProductInput> {
  const cleaned = { ...input };
  if (cleaned.price_per_kg == null) {
    delete cleaned.price_per_kg;
  }
  if (cleaned.weight_options_g == null) {
    delete cleaned.weight_options_g;
  }
  delete (cleaned as Record<string, unknown>).use_weight_pricing;
  return cleaned;
}

export const categoryRelationNameFields = 'id, name_ar, name_en';

export const CATALOG_STALE_TIME = 30 * 1000; // 30s — admin saves show after refresh/focus
export const CATALOG_GC_TIME = 30 * 60 * 1000;
