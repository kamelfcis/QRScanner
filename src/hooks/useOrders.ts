'use client';

import { useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { enqueueOrRun } from '@/lib/offline/enqueue-or-run';
import {
  patchAcknowledgeOrder,
  patchDeliveryFee,
  patchOrderStatus,
} from '@/lib/offline/optimistic-orders';
import { hasOfflinePwa } from '@/i18n/config';
import { useAdminQueryEnabled } from './useAdminQueryEnabled';
import { salesReportKeys } from './useSalesReport';
import { rangeUpperExclusive, toRangeBounds } from '@/lib/order/delete-range';
import { orderKeys } from '@/lib/order/query-keys';
import type { Order, OrderItem, OrderStatus, OrderWithItems } from '@/types/database';

export { orderKeys };

type RawOrderItem = OrderItem & {
  products?: { image_url: string | null } | null;
};

function normalizeOrderItem(item: RawOrderItem): OrderItem {
  const { products, ...rest } = item;
  return { ...rest, image_url: products?.image_url ?? null };
}

function asOrders(rows: Array<Order & { order_items?: RawOrderItem[] }> | null): OrderWithItems[] {
  return (rows ?? []).map((row) => {
    const { order_items, ...order } = row;
    return {
      ...order,
      items: (order_items ?? []).map(normalizeOrderItem),
    };
  });
}

export function useOrders() {
  const enabled = useAdminQueryEnabled();

  return useQuery({
    queryKey: orderKeys.lists(),
    enabled,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(image_url))')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return asOrders(data as Array<Order & { order_items?: RawOrderItem[] }>);
    },
    staleTime: 5 * 1000,
  });
}

const ORDER_BOARD_CHANNEL = 'order-board-changes';

type OrderBoardSubscription = {
  channel: RealtimeChannel;
  refCount: number;
  listeners: Set<() => void>;
};

let orderBoardSubscription: OrderBoardSubscription | null = null;

function notifyOrderBoardListeners() {
  orderBoardSubscription?.listeners.forEach((listener) => listener());
}

export function useRealtimeOrders() {
  const queryClient = useQueryClient();
  const enabled = useAdminQueryEnabled();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: orderKeys.all });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();

    if (!orderBoardSubscription) {
      const channel = supabase
        .channel(ORDER_BOARD_CHANNEL)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          notifyOrderBoardListeners
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'order_items' },
          notifyOrderBoardListeners
        )
        .subscribe();
      orderBoardSubscription = { channel, refCount: 0, listeners: new Set() };
    }

    orderBoardSubscription.refCount++;
    orderBoardSubscription.listeners.add(invalidate);

    return () => {
      if (!orderBoardSubscription) return;
      orderBoardSubscription.listeners.delete(invalidate);
      orderBoardSubscription.refCount--;
      if (orderBoardSubscription.refCount <= 0) {
        supabase.removeChannel(orderBoardSubscription.channel);
        orderBoardSubscription = null;
      }
    };
  }, [enabled, invalidate]);
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const onlineFn = async () => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('orders')
          .update({ status })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data as Order;
      };

      if (!hasOfflinePwa) return onlineFn();

      return enqueueOrRun({
        queryClient,
        type: 'update_order_status',
        payload: { orderId: id, status },
        clientMutationId: `status:${id}:${status}:${Date.now()}`,
        onlineFn,
        optimistic: () => patchOrderStatus(queryClient, id, status),
        offlineResult: { id, status } as Order,
      });
    },
    onSuccess: () => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: orderKeys.all });
      }
    },
  });
}

export function useAcknowledgeOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const onlineFn = async () => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('orders')
          .update({ staff_acknowledged_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data as Order;
      };

      if (!hasOfflinePwa) return onlineFn();

      return enqueueOrRun({
        queryClient,
        type: 'acknowledge_order',
        payload: { orderId: id },
        clientMutationId: `ack:${id}:${Date.now()}`,
        onlineFn,
        optimistic: () => patchAcknowledgeOrder(queryClient, id),
        offlineResult: { id } as Order,
      });
    },
    onSuccess: () => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: orderKeys.all });
      }
    },
  });
}

export function useSetOrderDeliveryFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, delivery_fee }: { id: string; delivery_fee: number }) => {
      const onlineFn = async () => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('orders')
          .update({ delivery_fee })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data as Order;
      };

      if (!hasOfflinePwa) return onlineFn();

      return enqueueOrRun({
        queryClient,
        type: 'set_delivery_fee',
        payload: { orderId: id, delivery_fee },
        clientMutationId: `fee:${id}:${delivery_fee}:${Date.now()}`,
        onlineFn,
        optimistic: () => patchDeliveryFee(queryClient, id, delivery_fee),
        offlineResult: { id, delivery_fee } as Order,
      });
    },
    onSuccess: () => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: orderKeys.all });
      }
    },
  });
}

export function useMarkOrderWhatsAppSent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('orders')
        .update({ whatsapp_sent: true })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export function useMarkOrderReadyWhatsAppSent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('orders')
        .update({ ready_whatsapp_sent_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: salesReportKeys.all });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useCountOrdersInRange() {
  return useMutation({
    mutationFn: async ({
      from,
      to,
      statuses,
    }: {
      from: string;
      to: string;
      statuses?: OrderStatus[];
    }) => {
      const bounds = toRangeBounds(from, to);
      const supabase = createClient();
      let query = supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', bounds.p_from)
        .lt('created_at', rangeUpperExclusive(to));

      if (statuses?.length) {
        query = query.in('status', statuses);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useDeleteOrdersInRange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      from,
      to,
      statuses,
    }: {
      from: string;
      to: string;
      statuses?: OrderStatus[];
    }) => {
      const res = await fetch('/api/orders/delete-range', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, statuses }),
      });

      const payload = (await res.json().catch(() => null)) as
        { deleted_count: number } | { error?: string; code?: string } | null;

      if (!res.ok) {
        const errPayload = payload && 'code' in payload ? payload : null;
        const code = errPayload?.code;
        throw new Error(code ?? errPayload?.error ?? 'delete_failed');
      }

      const okPayload = payload && 'deleted_count' in payload ? payload : null;
      return { deleted_count: okPayload?.deleted_count ?? 0 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
