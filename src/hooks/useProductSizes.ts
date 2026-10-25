'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { mergeSizeRows, type EcommerceProductSize } from '@/lib/catalog/ecommerce-sizes';
import { productKeys } from './useProducts';
import { categoryKeys } from './useCategories';

const supabase = createClient();

export const productSizeKeys = {
  all: ['product-sizes'] as const,
  detail: (productId: string) => [...productSizeKeys.all, productId] as const,
};

export function useProductSizes(productId: string | null) {
  return useQuery({
    queryKey: productSizeKeys.detail(productId ?? ''),
    enabled: Boolean(productId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_sizes')
        .select('*')
        .eq('product_id', productId!)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return mergeSizeRows((data ?? []) as EcommerceProductSize[]);
    },
  });
}

export function useSaveProductSizes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      sizes,
    }: {
      productId: string;
      sizes: EcommerceProductSize[];
    }) => {
      const response = await fetch(`/api/products/${productId}/sizes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sizes }),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
        sizes?: EcommerceProductSize[];
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? 'Failed to save product sizes');
      }

      return body?.sizes ?? [];
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: productSizeKeys.detail(variables.productId) });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}
