import { createClient } from '@/lib/supabase/server';

export async function fetchActiveProductOfferPrices(
  productIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (productIds.length === 0) return map;

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from('product_offers')
    .select('product_id, offer_price')
    .in('product_id', productIds)
    .eq('is_active', true)
    .lte('starts_at', now)
    .gt('ends_at', now);

  for (const row of data ?? []) {
    map.set(row.product_id, Number(row.offer_price));
  }
  return map;
}

export function applyOfferPrice(basePrice: number, offerPrice: number | undefined): number {
  if (offerPrice === undefined) return basePrice;
  return offerPrice;
}
