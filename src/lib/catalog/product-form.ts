import { productSchema, type ProductInput } from '@/types/schema';
import type { Product } from '@/types';
import { computeWeightPrice } from '@/lib/order/weight-price';
import { z } from 'zod';

export function parseWeightOptionsG(raw: string | undefined | null): number[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,،\s]+/)
    .map((part) => Number(part.trim()))
    .filter((grams) => Number.isFinite(grams) && grams > 0);
}

export function formatWeightOptionsG(weights: number[] | null | undefined): string {
  return weights?.length ? weights.join(', ') : '';
}

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

/** Restaurant dashboard form. Weight fields stay off the ecommerce schema. */
export const restaurantProductFormSchema = productSchema
  .extend({
    use_weight_pricing: z.boolean().default(false),
    price_per_kg: z.number().min(0).nullable().optional(),
    /** Comma-separated gram weights, e.g. "350, 500, 1000". */
    weight_options_g: z.string().optional(),
  })
  .refine(
    (data) => !data.use_weight_pricing || (data.price_per_kg != null && data.price_per_kg > 0),
    {
      message: 'Price per kg is required for weight-based pricing',
      path: ['price_per_kg'],
    }
  )
  .refine((data) => !data.use_weight_pricing || Boolean(data.weight_options_g?.trim()), {
    message: 'Select at least one weight option',
    path: ['weight_options_g'],
  });

export type RestaurantProductFormInput = z.input<typeof restaurantProductFormSchema>;
export type ProductFormInput = EcommerceProductFormInput | RestaurantProductFormInput;

export function getProductFormSchema(isEcommerce: boolean) {
  return isEcommerce ? ecommerceProductFormSchema : restaurantProductFormSchema;
}

/** Map form values to API/DB input. Ecommerce copies `price` to both price columns. */
export function productFormToInput(data: ProductFormInput, isEcommerce: boolean): ProductInput {
  if (isEcommerce) {
    const parsed = ecommerceProductFormSchema.parse(data);
    const { price, ...rest } = parsed;
    return { ...rest, dining_price: price, takeaway_price: price, is_spicy: false };
  }
  const parsed = restaurantProductFormSchema.parse(data);
  const { use_weight_pricing, weight_options_g, price_per_kg, ...rest } = parsed;
  const weights = parseWeightOptionsG(weight_options_g);

  if (use_weight_pricing && weights.length > 0 && price_per_kg != null) {
    const minPrice = Math.min(
      ...weights.map((grams) => computeWeightPrice(Number(price_per_kg), grams))
    );
    return {
      ...rest,
      dining_price: minPrice,
      takeaway_price: minPrice,
      price_per_kg: Number(price_per_kg),
      weight_options_g: weights,
    };
  }

  return {
    ...rest,
    price_per_kg: null,
    weight_options_g: null,
  };
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

  return {
    ...shared,
    is_spicy: false,
    dining_price: 0,
    takeaway_price: 0,
    use_weight_pricing: false,
    price_per_kg: null,
    weight_options_g: '',
  };
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
    use_weight_pricing: Boolean(product.price_per_kg && product.weight_options_g?.length),
    price_per_kg: product.price_per_kg ?? null,
    weight_options_g: formatWeightOptionsG(product.weight_options_g),
  };
}

/** Single display price for ecommerce product lists (prefers dining_price). */
export function getEcommerceDisplayPrice(
  product: Pick<Product, 'dining_price' | 'takeaway_price'>
) {
  return product.dining_price ?? product.takeaway_price ?? 0;
}
