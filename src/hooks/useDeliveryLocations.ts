'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAdminQueryEnabled } from './useAdminQueryEnabled';
import type { DeliveryLocation, DeliveryLocationInput } from '@/types';

const supabase = createClient();

export const deliveryLocationKeys = {
  all: ['delivery-locations'] as const,
  active: () => [...deliveryLocationKeys.all, 'active'] as const,
  admin: () => [...deliveryLocationKeys.all, 'admin'] as const,
};

export function useDeliveryLocations() {
  return useQuery({
    queryKey: deliveryLocationKeys.active(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_locations')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name_en', { ascending: true });
      if (error) throw error;
      return data as DeliveryLocation[];
    },
    staleTime: 60_000,
  });
}

export function useAllDeliveryLocations() {
  const enabled = useAdminQueryEnabled();

  return useQuery({
    queryKey: deliveryLocationKeys.admin(),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_locations')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name_en', { ascending: true });
      if (error) throw error;
      return data as DeliveryLocation[];
    },
  });
}

export function useCreateDeliveryLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeliveryLocationInput) => {
      const { data, error } = await supabase
        .from('delivery_locations')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as DeliveryLocation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryLocationKeys.all });
    },
  });
}

export function useUpdateDeliveryLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<DeliveryLocationInput> }) => {
      const { data, error } = await supabase
        .from('delivery_locations')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as DeliveryLocation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryLocationKeys.all });
    },
  });
}

export function useDeleteDeliveryLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('delivery_locations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryLocationKeys.all });
    },
  });
}
