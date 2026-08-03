'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Gallery, GalleryInput } from '@/types';
import { categoryKeys } from './useCategories';

const supabase = createClient();

export const galleryKeys = {
  all: ['gallery'] as const,
  visible: () => [...galleryKeys.all, 'visible'] as const,
  list: () => [...galleryKeys.all, 'list'] as const,
  detail: (id: string) => [...galleryKeys.all, 'detail', id] as const,
};

export function useVisibleGallery() {
  return useQuery({
    queryKey: galleryKeys.visible(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Gallery[];
    },
  });
}

export function useAllGallery() {
  return useQuery({
    queryKey: galleryKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Gallery[];
    },
  });
}

export function useGalleryItem(id: string) {
  return useQuery({
    queryKey: galleryKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Gallery;
    },
    enabled: !!id,
  });
}

export function useCreateGalleryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GalleryInput) => {
      const { data, error } = await supabase
        .from('gallery')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as Gallery;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: galleryKeys.all });
    },
  });
}

export function useUpdateGalleryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<GalleryInput> }) => {
      const { data, error } = await supabase
        .from('gallery')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Gallery;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: galleryKeys.all });
    },
  });
}

export function useDeleteGalleryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gallery').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: galleryKeys.all });
    },
  });
}

export function useReorderGallery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      const results = await Promise.allSettled(
        updates.map(({ id, sort_order }) =>
          supabase.from('gallery').update({ sort_order }).eq('id', id)
        )
      );

      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        throw new Error(`Failed to reorder ${failures.length} gallery items`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: galleryKeys.all });
    },
  });
}
