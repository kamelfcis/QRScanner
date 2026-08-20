'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Product, ProductInput, ProductWithGallery } from '@/types';
import {
  categoryRelationNameFields,
  popularProductFields,
  productTableFields,
  stripUnsupportedProductWriteFields,
  subcategoryRelationNameFields,
} from '@/lib/catalog/keys';
import { categoryKeys } from './useCategories';

const supabase = createClient();

function sanitizeSearch(query: string): string {
  return query.replace(/[%_]/g, (match) => `\\${match}`);
}

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (categoryId?: string) =>
    categoryId
      ? ([...productKeys.lists(), { categoryId }] as const)
      : ([...productKeys.lists()] as const),
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
  byCategory: (categoryId: string) => [...productKeys.all, 'category', categoryId] as const,
  popular: () => [...productKeys.all, 'popular'] as const,
  search: (query: string) => [...productKeys.all, 'search', query] as const,
};

export function useProducts(categoryId?: string) {
  return useQuery({
    queryKey: productKeys.list(categoryId),
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`${productTableFields}, category:categories(${categoryRelationNameFields})`)
        .order('sort_order', { ascending: true });

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ProductWithGallery[];
    },
  });
}

export function useAllProducts() {
  return useQuery({
    queryKey: productKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`${productTableFields}, category:categories(${categoryRelationNameFields})`)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as ProductWithGallery[];
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(
          `
          ${productTableFields},
          category:categories(${categoryRelationNameFields}),
          subcategory:subcategories(${subcategoryRelationNameFields}),
          gallery:product_gallery(id, product_id, image_url, sort_order, created_at)
        `
        )
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as ProductWithGallery;
    },
    enabled: !!id,
  });
}

export function useProductsByCategory(categoryId: string) {
  return useQuery({
    queryKey: productKeys.byCategory(categoryId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(productTableFields)
        .eq('category_id', categoryId)
        .eq('is_available', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!categoryId,
  });
}

export function usePopularProducts() {
  return useQuery({
    queryKey: productKeys.popular(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(popularProductFields)
        .eq('is_popular', true)
        .eq('is_available', true)
        .order('sort_order', { ascending: true })
        .limit(12);

      if (error) throw error;
      return data as unknown as Product[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSearchProducts(query: string) {
  const sanitized = sanitizeSearch(query);
  return useQuery({
    queryKey: productKeys.search(query),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`${productTableFields}, category:categories(${categoryRelationNameFields})`)
        .or(
          `name_en.ilike.%${sanitized}%,name_ar.ilike.%${sanitized}%,description_en.ilike.%${sanitized}%`
        )
        .eq('is_available', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as ProductWithGallery[];
    },
    enabled: query.length >= 2,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProductInput) => {
      const payload = stripUnsupportedProductWriteFields(input);
      const { data, error } = await supabase
        .from('products')
        .insert(payload)
        .select(productTableFields)
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<ProductInput> }) => {
      const payload = stripUnsupportedProductWriteFields(input);
      const { data, error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', id)
        .select(productTableFields)
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useReorderProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      const results = await Promise.allSettled(
        updates.map(({ id, sort_order }) =>
          supabase.from('products').update({ sort_order }).eq('id', id)
        )
      );

      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        throw new Error(`Failed to reorder ${failures.length} products`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useToggleProductAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_available }: { id: string; is_available: boolean }) => {
      const { data, error } = await supabase
        .from('products')
        .update({ is_available })
        .eq('id', id)
        .select(productTableFields)
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}
