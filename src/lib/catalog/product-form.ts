import { productSchema, type ProductInput } from '@/types/schema';
import type { Product } from '@/types';
import { z } from 'zod';

const productBaseFields = {
  category_id: true,
  subcategory_id: true,
  name_ar: true,
  name_en: true,
  description_ar: true,
  description_en: true,
  image_url: true,
  is_available: true,
  is_popular: true,
  is_new: true,
  is_bestseller: true,
  is_spicy: true,
  sort_order: true,
} as const;

const ecommerceBaseFields = {
  category_id: true,
  subcategory_id: true,
  name_ar: true,
  name_en: true,
  description_ar: true,
  description_en: true,
  image_url: true,
  is_available: true,
  is_popular: true,
  is_new: true,
  is_bestseller: true,
  sort_order: true,
} as const;

/** Dashboard product form for ecommerce stores — single price field, no spicy. */
export const ecommerceProductFormSchema = productSchema.pick(ecommerceBaseFields).extend({
  price: z.number().min(0, 'Price must be positive'),
});

export type EcommerceProductFormInput = z.input<typeof ecommerceProductFormSchema>;
export type RestaurantProductFormInput = z.input<typeof productSchema>;
export type ProductFormInput = EcommerceProductFormInput | RestaurantProductFormInput;

export function getProductFormSchema(isEcommerce: boolean) {
  return isEcommerce ? ecommerceProductFormSchema : productSchema;
}

/** Map form values to API/DB input. Ecommerce copies `price` to both price columns. */
export function productFormToInput(data: ProductFormInput, isEcommerce: boolean): ProductInput {
  if (isEcommerce) {
    const parsed = ecommerceProductFormSchema.parse(data);
    const { price, ...rest } = parsed;
    return { ...rest, dining_price: price, takeaway_price: price, is_spicy: false };
  }
  return productSchema.parse(data);
}

export function getDefaultProductFormValues(isEcommerce: boolean): ProductFormInput {
  const shared = {
    name_en: '',
    name_ar: '',
    description_en: '',
    description_ar: '',
    category_id: '',
    image_url: null,
    is_available: true,
    is_popular: false,
    is_new: false,
    is_bestseller: false,
    sort_order: 0,
  };

  if (isEcommerce) {
    return { ...shared, price: 0 };
  }

  return { ...shared, is_spicy: false, dining_price: 0, takeaway_price: 0 };
}

export function productToFormValues(product: Product, isEcommerce: boolean): ProductFormInput {
  const shared = {
    name_en: product.name_en,
    name_ar: product.name_ar,
    description_en: product.description_en ?? '',
    description_ar: product.description_ar ?? '',
    category_id: product.category_id,
    image_url: product.image_url,
    is_available: product.is_available,
    is_popular: product.is_popular,
    is_new: product.is_new,
    is_bestseller: product.is_bestseller,
    sort_order: product.sort_order,
  };

  if (isEcommerce) {
    return {
      ...shared,
      price: product.dining_price ?? product.takeaway_price ?? 0,
    };
  }

  return {
    ...shared,
    is_spicy: product.is_spicy,
    dining_price: product.dining_price,
    takeaway_price: product.takeaway_price,
  };
}

/** Single display price for ecommerce product lists (prefers dining_price). */
export function getEcommerceDisplayPrice(
  product: Pick<Product, 'dining_price' | 'takeaway_price'>
) {
  return product.dining_price ?? product.takeaway_price ?? 0;
}
