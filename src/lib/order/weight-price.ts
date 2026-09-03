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

export function minWeightPrice(product: WeightPricedProduct): number | null {
  if (!hasWeightOptions(product)) return null;
  const kg = Number(product.price_per_kg);
  const weights = product.weight_options_g!;
  return Math.min(...weights.map((g) => computeWeightPrice(kg, g)));
}
