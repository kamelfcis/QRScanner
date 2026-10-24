'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { ProductGallery } from '@/types';
import { productKeys } from './useProducts';

const supabase = createClient();

const galleryColumns = 'id, product_id, image_url, sort_order, created_at';

export interface ProductGalleryInsert {
  product_id: string;
  image_url: string;
  sort_order: number;
}

function invalidateProductGallery(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: productKeys.all });
  queryClient.invalidateQueries({ queryKey: productKeys.popular() });
}

export function productGalleryKey(productId: string | null | undefined) {
  return [...productKeys.all, 'gallery', productId ?? 'none'] as const;
}

export function useProductGallery(productId: string | null | undefined) {
  return useQuery({
    queryKey: productGalleryKey(productId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_gallery')
        .select(galleryColumns)
        .eq('product_id', productId!)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as ProductGallery[];
    },
    enabled: Boolean(productId),
  });
}

export function useInsertProductGallery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProductGalleryInsert) => {
      const { data, error } = await supabase
        .from('product_gallery')
        .insert(input)
        .select(galleryColumns)
        .single();

      if (error) throw error;
      return data as ProductGallery;
    },
    onSuccess: () => {
      invalidateProductGallery(queryClient);
    },
  });
}

export function useDeleteProductGallery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('product_gallery').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateProductGallery(queryClient);
    },
  });
}

export function useReorderProductGallery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const results = await Promise.all(
        orderedIds.map((id, sort_order) =>
          supabase.from('product_gallery').update({ sort_order }).eq('id', id)
        )
      );

      const failed = results.find((result) => result.error);
      if (failed?.error) throw new Error(failed.error.message);
    },
    onSuccess: () => {
      invalidateProductGallery(queryClient);
    },
  });
}
