import { digitsOnly } from '@/lib/phone/normalize';
import { normalizeOrderQuery, type LastOrderSnapshot } from '@/lib/order/last-order';
import type { OrderDiningMode, OrderStatus } from '@/types/database';

export const LIVE_STATUS_POLL_MS = 20_000;

const ORDER_STATUSES: OrderStatus[] = ['new', 'preparing', 'ready', 'completed', 'cancelled'];
const DINING_MODES: OrderDiningMode[] = ['dining', 'takeaway'];

export type LiveOrderStatus = {
  orderNumber: string;
  status: OrderStatus;
  updatedAt: string;
  diningMode?: OrderDiningMode;
};

export function canFetchLiveStatus(orderNumber?: string | null, phone?: string | null): boolean {
  return Boolean(normalizeOrderQuery(orderNumber) && digitsOnly(phone ?? '').length >= 8);
}

export function asOrderStatus(value: unknown): OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus) ? (value as OrderStatus) : 'new';
}

export function mergeLiveStatus(
  snapshot: LastOrderSnapshot | null,
  live: LiveOrderStatus,
  phone?: string | null
): LastOrderSnapshot {
  return {
    orderNumber: live.orderNumber,
    orderId: snapshot?.orderId,
    phone: phone || snapshot?.phone || null,
    customerName: snapshot?.customerName,
    status: live.status,
    diningMode: live.diningMode ?? snapshot?.diningMode,
    fulfillmentType: snapshot?.fulfillmentType,
    placedAt: snapshot?.placedAt ?? live.updatedAt,
    total: snapshot?.total,
    currency: snapshot?.currency,
  };
}

function parseLiveOrderStatus(payload: unknown): LiveOrderStatus | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  if (record.found !== true) return null;
  const orderNumber = normalizeOrderQuery(String(record.order_number ?? ''));
  if (!orderNumber) return null;
  const diningMode = DINING_MODES.includes(record.dining_mode as OrderDiningMode)
    ? (record.dining_mode as OrderDiningMode)
    : undefined;
  return {
    orderNumber,
    status: asOrderStatus(record.status),
    updatedAt: typeof record.updated_at === 'string' ? record.updated_at : new Date().toISOString(),
    diningMode,
  };
}

export async function fetchLiveOrderStatus(
  orderNumber: string,
  phone: string,
  phoneCountry?: string
): Promise<LiveOrderStatus | null> {
  if (!canFetchLiveStatus(orderNumber, phone)) return null;
  try {
    const response = await fetch('/api/orders/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_number: normalizeOrderQuery(orderNumber),
        customer_phone: phone,
        phone_country: phoneCountry,
      }),
    });
    if (!response.ok) return null;
    return parseLiveOrderStatus(await response.json());
  } catch {
    return null;
  }
}
