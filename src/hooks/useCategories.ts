'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Category, CategoryInput, CategoryWithProducts } from '@/types';
import {
  categoryKeys,
  categoryListFields,
  CATALOG_STALE_TIME,
  CATALOG_GC_TIME,
} from '@/lib/catalog/keys';
import { fetchCategoriesWithProducts } from '@/lib/catalog/fetchCatalog';

export { categoryKeys };

const supabase = createClient();

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.visible(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select(categoryListFields)
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as unknown as Category[];
    },
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
  });
}

export function useAllCategories() {
  return useQuery({
    queryKey: categoryKeys.allList(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: categoryKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').eq('id', id).single();

      if (error) throw error;
      return data as Category;
    },
    enabled: !!id,
  });
}

export function useCategoriesWithProducts() {
  return useQuery({
    queryKey: categoryKeys.withProducts(),
    queryFn: () => fetchCategoriesWithProducts(supabase),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CategoryInput) => {
      const { data, error } = await supabase.from('categories').insert(input).select().single();

      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CategoryInput> }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useReorderCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      const results = await Promise.allSettled(
        updates.map(({ id, sort_order }) =>
          supabase.from('categories').update({ sort_order }).eq('id', id)
        )
      );

      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        throw new Error(`Failed to reorder ${failures.length} categories`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}
