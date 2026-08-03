'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { RestaurantTable, RestaurantTableInput } from '@/types';

const supabase = createClient();

export const tableKeys = {
  all: ['restaurant-tables'] as const,
  lists: () => [...tableKeys.all, 'list'] as const,
  detail: (id: string) => [...tableKeys.all, 'detail', id] as const,
  active: () => [...tableKeys.all, 'active'] as const,
};

export function useRestaurantTables() {
  return useQuery({
    queryKey: tableKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .order('table_number', { ascending: true });

      if (error) throw error;
      return data as RestaurantTable[];
    },
  });
}

export function useActiveTables() {
  return useQuery({
    queryKey: tableKeys.active(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('is_active', true)
        .order('table_number', { ascending: true });

      if (error) throw error;
      return data as RestaurantTable[];
    },
  });
}

export function useCreateTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RestaurantTableInput) => {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as RestaurantTable;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tableKeys.all });
    },
  });
}

export function useUpdateTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<RestaurantTableInput> }) => {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as RestaurantTable;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tableKeys.all });
    },
  });
}

export function useDeleteTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('restaurant_tables').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tableKeys.all });
    },
  });
}
