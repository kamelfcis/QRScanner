'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAdminQueryEnabled } from './useAdminQueryEnabled';

const supabase = createClient();

export interface ShiftRow {
  id: string;
  opened_at: string;
  closed_at: string | null;
  status: 'open' | 'closed';
  opened_by: string | null;
  closed_by: string | null;
  opening_notes: string | null;
  closing_notes: string | null;
}

export const shiftKeys = {
  all: ['shifts'] as const,
  open: () => [...shiftKeys.all, 'open'] as const,
  list: () => [...shiftKeys.all, 'list'] as const,
};

export function useOpenShift(enabled = true) {
  const adminEnabled = useAdminQueryEnabled();
  return useQuery({
    queryKey: shiftKeys.open(),
    enabled: adminEnabled && enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('pos_get_open_shift');
      if (error) throw error;
      return (data as ShiftRow | null) ?? null;
    },
    staleTime: 15_000,
  });
}

export function useShiftHistory(limit = 20, enabled = true) {
  const adminEnabled = useAdminQueryEnabled();
  return useQuery({
    queryKey: [...shiftKeys.list(), limit],
    enabled: adminEnabled && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('opened_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ShiftRow[];
    },
    staleTime: 30_000,
  });
}

export function useOpenPosShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notes?: string | null) => {
      const { data, error } = await supabase.rpc('pos_open_shift', { p_notes: notes ?? null });
      if (error) throw error;
      return data as { id: string; status: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.all });
    },
  });
}

export function useClosePosShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { shiftId: string; notes?: string | null }) => {
      const { data, error } = await supabase.rpc('pos_close_shift', {
        p_shift_id: input.shiftId,
        p_notes: input.notes ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftKeys.all });
    },
  });
}
