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
    gallery:product_gallery(id, product_id, image_url, sort_order, created_at)
  )
`;

export const CATALOG_STALE_TIME = 5 * 60 * 1000; // 5 minutes for public catalog
export const CATALOG_GC_TIME = 30 * 60 * 1000;
