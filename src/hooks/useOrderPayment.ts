'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { PaymentMethod } from '@/lib/order/payment-close';
import { orderKeys } from '@/hooks/useOrders';
import { salesReportKeys } from '@/hooks/useSalesReport';
import type { Order } from '@/types/database';

export function useCloseOrderPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      paymentMethod,
      amountReceived,
    }: {
      orderId: string;
      paymentMethod: PaymentMethod;
      amountReceived?: number | null;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('close_order_payment', {
        p_order_id: orderId,
        p_payment_method: paymentMethod,
        p_amount_received: amountReceived ?? null,
      });
      if (error) throw error;
      return data as Order & {
        payment_method: PaymentMethod;
        amount_received: number;
        change_due: number;
        paid_at: string;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: salesReportKeys.all });
    },
  });
}

export function useVoidOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, reason }: { itemId: string; reason: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('void_order_item', {
        p_item_id: itemId,
        p_reason: reason.trim(),
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

export function useVoidOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('void_order', {
        p_order_id: orderId,
        p_reason: reason.trim(),
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
