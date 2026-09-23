import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it } from 'vitest';
import { orderKeys } from '@/lib/order/query-keys';
import {
  buildOptimisticStaffOrder,
  insertTempStaffOrder,
  patchAcknowledgeOrder,
  patchOrderStatus,
  replaceTempStaffOrder,
} from '@/lib/offline/optimistic-orders';
import type { OrderWithItems } from '@/types/database';
import type { StaffPlaceOrderInput } from '@/types/schema';

const baseOrder: OrderWithItems = {
  id: 'order-1',
  order_number: '1001',
  status: 'new',
  dining_mode: 'dining',
  fulfillment_type: null,
  table_number: '5',
  customer_name: 'Ali',
  customer_phone: null,
  delivery_address: null,
  delivery_location_id: null,
  notes: null,
  subtotal: 100,
  tax: 15,
  service: 10,
  discount_amount: 0,
  coupon_id: null,
  coupon_code: null,
  delivery_fee: 0,
  total: 125,
  currency: 'EGP',
  whatsapp_sent: false,
  ready_whatsapp_sent_at: null,
  staff_acknowledged_at: null,
  locale: 'ar',
  created_at: '2026-01-01T10:00:00.000Z',
  updated_at: '2026-01-01T10:00:00.000Z',
  items: [],
};

describe('offline optimistic orders', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(orderKeys.lists(), [baseOrder]);
  });

  it('patches order status in list cache', () => {
    patchOrderStatus(queryClient, 'order-1', 'preparing');
    const orders = queryClient.getQueryData<OrderWithItems[]>(orderKeys.lists());
    expect(orders?.[0].status).toBe('preparing');
  });

  it('patches acknowledge timestamp', () => {
    patchAcknowledgeOrder(queryClient, 'order-1');
    const orders = queryClient.getQueryData<OrderWithItems[]>(orderKeys.lists());
    expect(orders?.[0].staff_acknowledged_at).toBeTruthy();
  });

  it('inserts temp staff order at top of list', () => {
    const input: StaffPlaceOrderInput = {
      items: [{ product_id: '00000000-0000-4000-8000-000000000001', quantity: 1 }],
      dining_mode: 'dining',
      customer_name: 'Sara',
      locale: 'ar',
    };
    const temp = buildOptimisticStaffOrder(queryClient, input, 'offline-abc');
    insertTempStaffOrder(queryClient, temp);

    const orders = queryClient.getQueryData<OrderWithItems[]>(orderKeys.lists());
    expect(orders).toHaveLength(2);
    expect(orders?.[0].id).toBe('offline-abc');
    expect(orders?.[0].order_number).toMatch(/^OFF-/);
  });

  it('replaces temp staff order with server order', () => {
    const temp: OrderWithItems = { ...baseOrder, id: 'offline-abc', order_number: 'OFF-1234' };
    queryClient.setQueryData(orderKeys.lists(), [temp]);
    const server: OrderWithItems = { ...baseOrder, id: 'server-99', order_number: '1042' };

    replaceTempStaffOrder(queryClient, 'offline-abc', server);

    const orders = queryClient.getQueryData<OrderWithItems[]>(orderKeys.lists());
    expect(orders?.[0].id).toBe('server-99');
    expect(orders?.[0].order_number).toBe('1042');
  });
});
