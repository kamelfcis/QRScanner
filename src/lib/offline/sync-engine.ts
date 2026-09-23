import type { QueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { orderKeys } from '@/lib/order/query-keys';
import type { OrderItem, OrderStatus, OrderWithItems } from '@/types/database';
import type { StaffPlaceOrderInput } from '@/types/schema';
import {
  getPendingOutboxRows,
  incrementOutboxAttempts,
  markOutboxRowFailed,
  removeOutboxRow,
} from './db';
import { markTempStaffOrderFailed, replaceTempStaffOrder } from './optimistic-orders';
import { notifyOutboxChanged, type OutboxRow, type PlaceStaffOrderPayload } from './types';

export class SyncStopError extends Error {
  constructor(message = 'network') {
    super(message);
    this.name = 'SyncStopError';
  }
}

export class SyncConflictError extends Error {
  code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'SyncConflictError';
    this.code = code;
  }
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof SyncStopError) return true;
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch');
  }
  return false;
}

async function executeUpdateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
  if (error) {
    if (error.code === 'PGRST116') throw new SyncConflictError('order_not_found', error.message);
    throw error;
  }
}

async function executeAcknowledgeOrder(orderId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('orders')
    .update({ staff_acknowledged_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) {
    if (error.code === 'PGRST116') throw new SyncConflictError('order_not_found', error.message);
    throw error;
  }
}

async function executeSetDeliveryFee(orderId: string, delivery_fee: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('orders').update({ delivery_fee }).eq('id', orderId);
  if (error) {
    if (error.code === 'PGRST116') throw new SyncConflictError('order_not_found', error.message);
    throw error;
  }
}

type RawOrderItem = OrderItem & {
  products?: { image_url: string | null } | null;
};

function normalizeOrderItem(item: RawOrderItem): OrderItem {
  const { products, ...rest } = item;
  return { ...rest, image_url: products?.image_url ?? null };
}

async function fetchStaffOrderReceipt(orderId: string): Promise<OrderWithItems> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, products(image_url))')
    .eq('id', orderId)
    .single();
  if (error) throw error;
  const { order_items, ...order } = data as typeof data & { order_items?: RawOrderItem[] };
  return {
    ...order,
    items: (order_items ?? []).map(normalizeOrderItem),
  } as OrderWithItems;
}

async function executePlaceStaffOrder(
  input: StaffPlaceOrderInput,
  tempOrderId: string,
  queryClient: QueryClient
): Promise<void> {
  const res = await fetch('/api/orders/staff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    code?: string;
    error?: string;
  };

  if (!res.ok) {
    const code = body.code ?? body.error ?? 'place_failed';
    if (res.status === 409 && code === 'product_unavailable') {
      markTempStaffOrderFailed(queryClient, tempOrderId);
      throw new SyncConflictError(code);
    }
    if (res.status >= 500 || res.status === 0) {
      throw new SyncStopError(code);
    }
    markTempStaffOrderFailed(queryClient, tempOrderId);
    throw new SyncConflictError(code);
  }

  if (body.id) {
    const cached = queryClient
      .getQueryData<OrderWithItems[]>(orderKeys.lists())
      ?.find((order) => order.id === tempOrderId);

    const serverOrder = await fetchStaffOrderReceipt(body.id);
    replaceTempStaffOrder(queryClient, tempOrderId, serverOrder);

    if (cached?.status && cached.status !== serverOrder.status) {
      await executeUpdateOrderStatus(body.id, cached.status);
    }
    if (cached?.staff_acknowledged_at && !serverOrder.staff_acknowledged_at) {
      await executeAcknowledgeOrder(body.id);
    }
  }
}

async function executeOutboxRow(row: OutboxRow, queryClient: QueryClient): Promise<void> {
  switch (row.type) {
    case 'update_order_status': {
      const payload = row.payload as { orderId: string; status: OrderStatus };
      await executeUpdateOrderStatus(payload.orderId, payload.status);
      break;
    }
    case 'acknowledge_order': {
      const payload = row.payload as { orderId: string };
      await executeAcknowledgeOrder(payload.orderId);
      break;
    }
    case 'set_delivery_fee': {
      const payload = row.payload as { orderId: string; delivery_fee: number };
      await executeSetDeliveryFee(payload.orderId, payload.delivery_fee);
      break;
    }
    case 'place_staff_order': {
      const payload = row.payload as PlaceStaffOrderPayload;
      await executePlaceStaffOrder(payload.input, payload.tempOrderId, queryClient);
      break;
    }
    default:
      throw new SyncConflictError('unknown_mutation');
  }
}

export interface SyncEngineResult {
  processed: number;
  failed: number;
  stopped: boolean;
  lastError: string | null;
}

let flushing = false;

export async function flushOutbox(queryClient: QueryClient): Promise<SyncEngineResult> {
  if (flushing || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return { processed: 0, failed: 0, stopped: true, lastError: null };
  }

  flushing = true;
  let processed = 0;
  let failed = 0;
  let stopped = false;
  let lastError: string | null = null;

  try {
    const rows = await getPendingOutboxRows();

    for (const row of rows) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        stopped = true;
        break;
      }

      try {
        await incrementOutboxAttempts(row.id);
        await executeOutboxRow(row, queryClient);
        await removeOutboxRow(row.id);
        processed++;
      } catch (error) {
        if (isNetworkError(error)) {
          stopped = true;
          lastError = error instanceof Error ? error.message : 'network';
          break;
        }

        const code =
          error instanceof SyncConflictError
            ? error.code
            : error instanceof Error
              ? error.message
              : 'sync_failed';

        await markOutboxRowFailed(row.id, code);
        failed++;
        lastError = code;

        if (row.type === 'place_staff_order') {
          const payload = row.payload as PlaceStaffOrderPayload;
          markTempStaffOrderFailed(queryClient, payload.tempOrderId);
        }

        await queryClient.invalidateQueries({ queryKey: orderKeys.all });
      }
    }

    if (processed > 0 || failed > 0) {
      await queryClient.invalidateQueries({ queryKey: orderKeys.all });
    }
  } finally {
    flushing = false;
    notifyOutboxChanged();
  }

  return { processed, failed, stopped, lastError };
}
