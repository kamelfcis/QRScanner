'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Offer, OfferInput } from '@/types';
import { menuKeys } from './useMenuStats';

const supabase = createClient();

// Query Keys
export const offerKeys = {
  all: ['offers'] as const,
  lists: () => [...offerKeys.all, 'list'] as const,
  list: () => [...offerKeys.lists()] as const,
  details: () => [...offerKeys.all, 'detail'] as const,
  detail: (id: string) => [...offerKeys.details(), id] as const,
  active: () => [...offerKeys.all, 'active'] as const,
};

// Queries
export function useActiveOffers() {
  return useQuery({
    queryKey: offerKeys.active(),
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Offer[];
    },
  });
}

export function useAllOffers() {
  return useQuery({
    queryKey: offerKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Offer[];
    },
  });
}

export function useOffer(id: string) {
  return useQuery({
    queryKey: offerKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('offers').select('*').eq('id', id).single();

      if (error) throw error;
      return data as Offer;
    },
    enabled: !!id,
  });
}

// Mutations
export function useCreateOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: OfferInput) => {
      const { data, error } = await supabase.from('offers').insert(input).select().single();

      if (error) throw error;
      return data as Offer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: offerKeys.all });
      queryClient.invalidateQueries({ queryKey: menuKeys.all });
    },
  });
}

export function useUpdateOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<OfferInput> }) => {
      const { data, error } = await supabase
        .from('offers')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Offer;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: offerKeys.all });
      queryClient.invalidateQueries({ queryKey: offerKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: menuKeys.all });
    },
  });
}

export function useDeleteOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('offers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: offerKeys.all });
      queryClient.invalidateQueries({ queryKey: menuKeys.all });
    },
  });
}

export function useToggleOfferActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('offers')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Offer;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: offerKeys.all });
      queryClient.invalidateQueries({ queryKey: offerKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: menuKeys.all });
    },
  });
}
