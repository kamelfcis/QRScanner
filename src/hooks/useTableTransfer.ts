'use client';

import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { orderKeys } from '@/hooks/useOrders';
import { useActiveTables } from '@/hooks/useRestaurantTables';
import { useTableOccupancy } from '@/hooks/useTableOccupancy';
import type { Order } from '@/types/database';

export function useTableTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, tableNumber }: { orderId: string; tableNumber: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('transfer_order_table', {
        p_order_id: orderId,
        p_table_number: tableNumber.trim(),
      });
      if (error) throw error;
      return data as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export function useFreeTablesForTransfer(currentTableNumber?: string | null) {
  const { data: tables, isLoading, error } = useActiveTables();
  const { occupancyByTable } = useTableOccupancy();

  const freeTables = useMemo(() => {
    const current = currentTableNumber?.trim();
    return (tables ?? []).filter((table) => {
      const num = String(table.table_number);
      if (current && num === current) return false;
      return !occupancyByTable.has(num);
    });
  }, [tables, occupancyByTable, currentTableNumber]);

  return { freeTables, isLoading, error };
}
