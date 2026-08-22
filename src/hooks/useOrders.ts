'use client';

import { useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAdminQueryEnabled } from './useAdminQueryEnabled';
import { rangeUpperExclusive, toRangeBounds } from '@/lib/order/delete-range';
import type { Order, OrderItem, OrderStatus, OrderWithItems } from '@/types/database';

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
};

function asOrders(rows: Array<Order & { order_items?: OrderItem[] }> | null): OrderWithItems[] {
  return (rows ?? []).map((row) => {
    const { order_items, ...order } = row;
    return { ...order, items: order_items ?? [] };
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
        .select('*, order_items(*)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return asOrders(data as Array<Order & { order_items?: OrderItem[] }>);
    },
    staleTime: 5 * 1000,
  });
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
    const channel = supabase
      .channel('order-board-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, invalidate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, invalidate]);
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
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

export function useAcknowledgeOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('orders')
        .update({ staff_acknowledged_at: new Date().toISOString() })
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
