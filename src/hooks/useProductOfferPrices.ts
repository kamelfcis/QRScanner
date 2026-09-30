'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { isAlaKeefakTenant } from '@/i18n/config';
import { applyOfferPrice } from '@/lib/customer/product-offer-price';

const supabase = createClient();

export const productOfferPriceKeys = {
  all: ['product-offer-prices'] as const,
};

export function useProductOfferPrices(enabled = isAlaKeefakTenant) {
  return useQuery({
    queryKey: productOfferPriceKeys.all,
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('product_offers')
        .select('product_id, offer_price')
        .eq('is_active', true)
        .lte('starts_at', now)
        .gt('ends_at', now);

      if (error) throw error;

      const map = new Map<string, number>();
      for (const row of data ?? []) {
        map.set(row.product_id, Number(row.offer_price));
      }
      return map;
    },
  });
}

export function useProductOfferPrice(productId: string | undefined, basePrice: number): number {
  const { data: offerPrices } = useProductOfferPrices(isAlaKeefakTenant && Boolean(productId));
  if (!productId) return basePrice;
  return applyOfferPrice(basePrice, offerPrices?.get(productId));
}
