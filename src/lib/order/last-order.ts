import { digitsOnly } from '@/lib/phone/normalize';
import type { OrderStatus } from '@/types/database';

export const LAST_ORDER_STORAGE_KEY = 'warda-last-order';

export type LastOrderSnapshot = {
  orderNumber: string;
  orderId?: string;
  phone?: string | null;
  customerName?: string;
  status: OrderStatus;
  diningMode?: 'dining' | 'takeaway';
  fulfillmentType?: 'pickup' | 'delivery' | null;
  placedAt: string;
  total?: number;
  currency?: string;
};

export function normalizeOrderQuery(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, '').toUpperCase();
}

/** Match stored vs typed phone without treating local vs international as different people. */
export function phonesMatch(
  stored: string | null | undefined,
  entered: string | null | undefined
): boolean {
  const a = digitsOnly(stored ?? '');
  const b = digitsOnly(entered ?? '');
  if (!a || !b) return false;
  if (a === b) return true;
  const minLen = 8;
  if (a.length >= minLen && b.length >= minLen) {
    const tail = Math.min(9, a.length, b.length);
    return a.slice(-tail) === b.slice(-tail);
  }
  return a.endsWith(b) || b.endsWith(a);
}

export function isLastOrderSnapshot(value: unknown): value is LastOrderSnapshot {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.orderNumber === 'string' && record.orderNumber.trim().length > 0;
}

export function readLastOrder(): LastOrderSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LAST_ORDER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isLastOrderSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeLastOrder(snapshot: LastOrderSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAST_ORDER_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // quota / private mode
  }
}

export function matchLastOrder(
  snapshot: LastOrderSnapshot | null,
  query: { orderNumber?: string | null; phone?: string | null }
): boolean {
  if (!snapshot) return false;
  const wantNumber = normalizeOrderQuery(query.orderNumber);
  const wantPhone = (query.phone ?? '').trim();
  if (!wantNumber && !wantPhone) return false;
  if (wantNumber && wantNumber !== normalizeOrderQuery(snapshot.orderNumber)) return false;
  if (wantPhone && !phonesMatch(snapshot.phone, wantPhone)) return false;
  return true;
}

export function buildOrderStatusPath(orderNumber?: string | null): string {
  const normalized = normalizeOrderQuery(orderNumber);
  if (!normalized) return '/order-status';
  return `/order-status?order=${encodeURIComponent(normalized)}`;
}
