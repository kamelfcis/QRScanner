export function applyOfferPrice(basePrice: number, offerPrice: number | undefined): number {
  if (offerPrice === undefined) return basePrice;
  return offerPrice;
}
