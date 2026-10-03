'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAdminQueryEnabled } from './useAdminQueryEnabled';
import type { SalesReportKpis } from '@/lib/order/sales-kpis';
import type { DailyOpsBreakdown } from '@/lib/order/shift-daily-breakdown';

const supabase = createClient();

export interface ShiftCloseSnapshot {
  kpis: SalesReportKpis;
  currency?: string;
  dailyOps?: DailyOpsBreakdown;
}

export interface ShiftCloseRow {
  id: string;
  closed_at: string;
  closed_by: string | null;
  period_start: string;
  period_end: string;
  snapshot: ShiftCloseSnapshot;
  notes: string | null;
}

export const shiftCloseKeys = {
  all: ['shift-closes'] as const,
  recent: () => [...shiftCloseKeys.all, 'recent'] as const,
};

export function useRecentShiftCloses(limit = 5) {
  const enabled = useAdminQueryEnabled();

  return useQuery({
    queryKey: shiftCloseKeys.recent(),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_closes')
        .select('*')
        .order('closed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as ShiftCloseRow[];
    },
    staleTime: 30_000,
  });
}

export function useCloseShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      period_start: string;
      period_end: string;
      snapshot: ShiftCloseSnapshot;
      notes?: string | null;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('shift_closes')
        .insert({
          period_start: input.period_start,
          period_end: input.period_end,
          snapshot: input.snapshot,
          notes: input.notes ?? null,
          closed_by: user?.id ?? null,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data as ShiftCloseRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftCloseKeys.all });
    },
  });
}
