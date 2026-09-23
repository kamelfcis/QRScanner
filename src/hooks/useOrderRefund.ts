'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { orderKeys } from '@/hooks/useOrders';
import { salesReportKeys } from '@/hooks/useSalesReport';
import type { Order } from '@/types/database';

export function useOrderRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('refund_order_payment', {
        p_order_id: orderId,
        p_reason: reason.trim(),
      });
      if (error) throw error;
      return data as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: salesReportKeys.all });
    },
  });
}
