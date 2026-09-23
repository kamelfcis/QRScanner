import type { OrderStatus } from '@/types/database';
import type { StaffPlaceOrderInput } from '@/types/schema';

export type OutboxMutationType =
  'update_order_status' | 'acknowledge_order' | 'set_delivery_fee' | 'place_staff_order';

export type OutboxStatus = 'pending' | 'failed';

export interface UpdateOrderStatusPayload {
  orderId: string;
  status: OrderStatus;
}

export interface AcknowledgeOrderPayload {
  orderId: string;
}

export interface SetDeliveryFeePayload {
  orderId: string;
  delivery_fee: number;
}

export interface PlaceStaffOrderPayload {
  input: StaffPlaceOrderInput;
  tempOrderId: string;
}

export type OutboxPayload =
  | UpdateOrderStatusPayload
  | AcknowledgeOrderPayload
  | SetDeliveryFeePayload
  | PlaceStaffOrderPayload;

export interface OutboxRow {
  id: string;
  type: OutboxMutationType;
  payload: OutboxPayload;
  clientMutationId: string;
  createdAt: string;
  attempts: number;
  status: OutboxStatus;
  lastError?: string;
}

export const OFFLINE_OUTBOX_CHANGED = 'warda-offline-outbox-changed';

export function notifyOutboxChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OFFLINE_OUTBOX_CHANGED));
}

export function isOfflineTempOrderId(id: string): boolean {
  return id.startsWith('offline-');
}
