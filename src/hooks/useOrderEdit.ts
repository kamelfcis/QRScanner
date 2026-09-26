'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { orderKeys } from '@/hooks/useOrders';
import { salesReportKeys } from '@/hooks/useSalesReport';
import type { OrderSizeOption } from '@/types/database';

export interface AppendOrderItemInput {
  product_id: string;
  quantity: number;
  size_option?: OrderSizeOption | null;
  weight_grams?: number | null;
  notes?: string | null;
}

export function useUpdateOrderItemQuantity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('update_order_item_quantity', {
        p_item_id: itemId,
        p_quantity: quantity,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: salesReportKeys.all });
    },
  });
}

export function useAppendOrderItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, items }: { orderId: string; items: AppendOrderItemInput[] }) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('append_items_to_order', {
        p_order_id: orderId,
        p_items: items,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: salesReportKeys.all });
    },
  });
}
