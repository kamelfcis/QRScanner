'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Testimonial, TestimonialInput } from '@/types';

const supabase = createClient();

// Query Keys
export const testimonialKeys = {
  all: ['testimonials'] as const,
  lists: () => [...testimonialKeys.all, 'list'] as const,
  list: () => [...testimonialKeys.lists()] as const,
  details: () => [...testimonialKeys.all, 'detail'] as const,
  detail: (id: string) => [...testimonialKeys.details(), id] as const,
  featured: () => [...testimonialKeys.all, 'featured'] as const,
};

// Queries
export function useTestimonials() {
  return useQuery({
    queryKey: testimonialKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Testimonial[];
    },
  });
}

export function useFeaturedTestimonials() {
  return useQuery({
    queryKey: testimonialKeys.featured(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('is_featured', true)
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Testimonial[];
    },
  });
}

export function useAllTestimonials() {
  return useQuery({
    queryKey: testimonialKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Testimonial[];
    },
  });
}

export function useTestimonial(id: string) {
  return useQuery({
    queryKey: testimonialKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Testimonial;
    },
    enabled: !!id,
  });
}

// Mutations
export function useCreateTestimonial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TestimonialInput) => {
      const { data, error } = await supabase
        .from('testimonials')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as Testimonial;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: testimonialKeys.all });
    },
  });
}

export function useUpdateTestimonial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<TestimonialInput> }) => {
      const { data, error } = await supabase
        .from('testimonials')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Testimonial;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: testimonialKeys.all });
      queryClient.invalidateQueries({ queryKey: testimonialKeys.detail(variables.id) });
    },
  });
}

export function useDeleteTestimonial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('testimonials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: testimonialKeys.all });
    },
  });
}
