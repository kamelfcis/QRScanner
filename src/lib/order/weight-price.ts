import {
  getProductSizePrice,
  type ProductSizeFields,
  type ProductSizeId,
} from '@/lib/catalog/product-sizes';

/** Round EGP-style weight price: price_per_kg × grams ÷ 1000 */
export function computeWeightPrice(pricePerKg: number, grams: number): number {
  return Math.round((Number(pricePerKg) * Number(grams)) / 1000);
}

export interface WeightPricedProduct {
  price_per_kg?: number | null;
  weight_options_g?: number[] | null;
}

export function hasWeightOptions(product: WeightPricedProduct): boolean {
  return (
    product.price_per_kg != null &&
    Array.isArray(product.weight_options_g) &&
    product.weight_options_g.length > 0
  );
}

export function getStaffLineUnitPrice(
  product: WeightPricedProduct &
    ProductSizeFields & {
      has_size_options?: boolean;
    },
  diningMode: 'dining' | 'takeaway',
  sizeOption?: ProductSizeId | null,
  weightGrams?: number | null
): number {
  if (weightGrams != null && product.price_per_kg != null) {
    return computeWeightPrice(product.price_per_kg, weightGrams);
  }
  if (product.has_size_options && sizeOption) {
    return getProductSizePrice(product, sizeOption);
  }
  return diningMode === 'takeaway' ? product.takeaway_price : product.dining_price;
}

export function minWeightPrice(product: WeightPricedProduct): number | null {
  if (!hasWeightOptions(product)) return null;
  const kg = Number(product.price_per_kg);
  const weights = product.weight_options_g!;
  return Math.min(...weights.map((g) => computeWeightPrice(kg, g)));
}
