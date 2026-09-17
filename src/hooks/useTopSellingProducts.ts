'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAdminQueryEnabled } from './useAdminQueryEnabled';
import {
  DEFAULT_TOP_SELLING_DAYS,
  DEFAULT_TOP_SELLING_LIMIT,
  TOP_SELLING_BADGE_LIMIT,
  type TopSellingProduct,
} from '@/lib/order/top-selling';
import { hasHettSamakaTier1 } from '@/i18n/config';

const supabase = createClient();

export const topSellingKeys = {
  all: ['top-selling'] as const,
  list: (days: number, limit: number) => [...topSellingKeys.all, days, limit] as const,
};

interface RpcTopSellingRow {
  product_id: string;
  total_quantity: number;
  name_en: string;
  name_ar: string;
  name_fr: string | null;
  name_nl: string | null;
}

async function fetchTopSelling(days: number, limit: number): Promise<TopSellingProduct[]> {
  const { data, error } = await supabase.rpc('get_top_selling_products', {
    p_days: days,
    p_limit: limit,
  });

  if (error) throw error;

  return ((data as RpcTopSellingRow[] | null) ?? []).map((row) => ({
    product_id: row.product_id,
    quantity: Number(row.total_quantity),
    name_en: row.name_en,
    name_ar: row.name_ar,
    name_fr: row.name_fr,
    name_nl: row.name_nl,
  }));
}

export function useTopSellingProducts(
  days = DEFAULT_TOP_SELLING_DAYS,
  limit = DEFAULT_TOP_SELLING_LIMIT
) {
  return useQuery({
    queryKey: topSellingKeys.list(days, limit),
    queryFn: () => fetchTopSelling(days, limit),
    enabled: hasHettSamakaTier1,
    staleTime: 5 * 60_000,
  });
}

export function useTopSellingProductIds(limit = TOP_SELLING_BADGE_LIMIT) {
  const query = useTopSellingProducts(DEFAULT_TOP_SELLING_DAYS, limit);
  const ids = query.data?.map((row) => row.product_id) ?? [];
  return { ...query, topProductIds: ids };
}

export function useApplyBestsellerBadges() {
  const queryClient = useQueryClient();
  const adminEnabled = useAdminQueryEnabled();

  return useMutation({
    mutationFn: async () => {
      if (!adminEnabled) throw new Error('Unauthorized');

      const top = await fetchTopSelling(DEFAULT_TOP_SELLING_DAYS, TOP_SELLING_BADGE_LIMIT);
      const topIds = top.map((row) => row.product_id);

      const { error: clearError } = await supabase
        .from('products')
        .update({ is_bestseller: false })
        .eq('is_bestseller', true);
      if (clearError) throw clearError;

      if (topIds.length === 0) return { updated: 0 };

      const { error: setError } = await supabase
        .from('products')
        .update({ is_bestseller: true })
        .in('id', topIds);
      if (setError) throw setError;

      return { updated: topIds.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: topSellingKeys.all });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
