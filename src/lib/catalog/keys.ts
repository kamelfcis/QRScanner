import { hasExtendedMenuLocales, hasProductSizeOptions } from '@/i18n/config';

export const categoryKeys = {
  all: ['categories'] as const,
  visible: () => [...categoryKeys.all, 'visible'] as const,
  allList: () => [...categoryKeys.all, 'allList'] as const,
  detail: (id: string) => [...categoryKeys.all, 'detail', id] as const,
  withProducts: () => [...categoryKeys.all, 'withProducts'] as const,
};

/** Name/description columns safe for all tenants (ar/en only when fr/nl not enabled). */
export const catalogNameFields = hasExtendedMenuLocales
  ? 'name_ar, name_en, name_fr, name_nl'
  : 'name_ar, name_en';

export const catalogDescriptionFields = hasExtendedMenuLocales
  ? 'description_ar, description_en, description_fr, description_nl'
  : 'description_ar, description_en';

export const categoryRelationNameFields = hasExtendedMenuLocales
  ? 'id, name_en, name_ar, name_fr, name_nl'
  : 'id, name_en, name_ar';

export const subcategoryRelationNameFields = hasExtendedMenuLocales
  ? 'id, name_en, name_ar, name_fr, name_nl'
  : 'id, name_en, name_ar';

export const categoryListFields = `id, ${catalogNameFields}, ${catalogDescriptionFields}, image_url, banner_url, sort_order, is_visible`;

const productSizeField = hasProductSizeOptions ? 'has_size_options, ' : '';

export const popularProductFields = `id, category_id, subcategory_id, ${catalogNameFields}, ${catalogDescriptionFields}, image_url, dining_price, takeaway_price, ${productSizeField}is_available, is_popular, is_new, is_bestseller, is_spicy, sort_order, created_at, updated_at`;

/** Dashboard product reads/writes — same tenant-safe columns as popularProductFields. */
export const productTableFields = popularProductFields;

const EXTENDED_LOCALE_WRITE_KEYS = [
  'name_fr',
  'name_nl',
  'description_fr',
  'description_nl',
] as const;

/** Drop product columns this tenant’s schema does not have (no migration 016 / 018). */
export function stripUnsupportedProductWriteFields<T extends object>(input: T): T {
  const next: Record<string, unknown> = { ...input };
  if (!hasExtendedMenuLocales) {
    for (const key of EXTENDED_LOCALE_WRITE_KEYS) {
      delete next[key];
    }
  }
  if (!hasProductSizeOptions) {
    delete next.has_size_options;
  }
  return next as T;
}

/** Narrow select for public menu catalog — avoids select('*') fan-out */
export const CATALOG_WITH_PRODUCTS_SELECT = `
  id, ${catalogNameFields}, ${catalogDescriptionFields}, image_url, banner_url, sort_order, is_visible, created_at, updated_at,
  subcategories:subcategories!category_id(
    id, category_id, ${catalogNameFields}, ${catalogDescriptionFields}, image_url, sort_order, is_visible, created_at, updated_at
  ),
  products:products!category_id(
    id, category_id, subcategory_id, ${catalogNameFields}, ${catalogDescriptionFields},
    image_url, dining_price, takeaway_price, ${productSizeField}is_available, is_popular, is_new, is_bestseller,
    is_spicy, sort_order, created_at, updated_at,
    gallery:product_gallery(id, product_id, image_url, sort_order, created_at)
  )
`;

export const CATALOG_STALE_TIME = 5 * 60 * 1000; // 5 minutes for public catalog
export const CATALOG_GC_TIME = 30 * 60 * 1000;
