'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Category, CategoryInput, CategoryWithProducts } from '@/types';

const supabase = createClient();

export const categoryKeys = {
  all: ['categories'] as const,
  visible: () => [...categoryKeys.all, 'visible'] as const,
  allList: () => [...categoryKeys.all, 'allList'] as const,
  detail: (id: string) => [...categoryKeys.all, 'detail', id] as const,
  withProducts: () => [...categoryKeys.all, 'withProducts'] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.visible(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
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
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Category;
    },
    enabled: !!id,
  });
}

export function useCategoriesWithProducts() {
  return useQuery({
    queryKey: categoryKeys.withProducts(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          subcategories:subcategories!category_id(
            *
          ),
          products:products!category_id(
            *,
            gallery:product_gallery(*)
          )
        `)
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const categories = data.map((category) => ({
        ...category,
        products: (category.products || [])
          .filter((p: { is_available: boolean }) => p.is_available)
          .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order),
        subcategories: (category.subcategories || []).sort(
          (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
        ),
      })) as CategoryWithProducts[];

      return categories;
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CategoryInput) => {
      const { data, error } = await supabase
        .from('categories')
        .insert(input)
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
    onSuccess: (_data, variables) => {
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
