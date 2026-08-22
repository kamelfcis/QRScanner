import { describe, expect, it } from 'vitest';
import { computeSalesKpis } from '@/lib/order/sales-kpis';
import type { Order } from '@/types/database';

function order(partial: Partial<Order>): Order {
  return {
    id: partial.id ?? '1',
    order_number: partial.order_number ?? 'AHS-1',
    status: partial.status ?? 'completed',
    dining_mode: partial.dining_mode ?? 'takeaway',
    fulfillment_type: partial.fulfillment_type ?? 'delivery',
    table_number: null,
    customer_name: 'Guest',
    customer_phone: '201000000000',
    delivery_address: null,
    notes: null,
    subtotal: 100,
    tax: 0,
    service: 0,
    discount_amount: partial.discount_amount ?? 0,
    coupon_id: null,
    coupon_code: null,
    total: partial.total ?? 100,
    currency: 'EGP',
    whatsapp_sent: false,
    staff_acknowledged_at: null,
    locale: 'ar',
    created_at: '2026-08-22T10:00:00.000Z',
    updated_at: '2026-08-22T10:00:00.000Z',
    ...partial,
  };
}

describe('computeSalesKpis', () => {
  it('excludes cancelled orders from revenue, discounts, AOV, and delivery', () => {
    const kpis = computeSalesKpis([
      order({ id: '1', total: 200, discount_amount: 20, fulfillment_type: 'delivery' }),
      order({ id: '2', total: 100, discount_amount: 0, fulfillment_type: 'pickup' }),
      order({
        id: '3',
        status: 'cancelled',
        total: 500,
        discount_amount: 50,
        fulfillment_type: 'delivery',
      }),
    ]);

    expect(kpis.orderCount).toBe(3);
    expect(kpis.revenue).toBe(300);
    expect(kpis.discounts).toBe(20);
    expect(kpis.averageOrderValue).toBe(150);
    expect(kpis.deliveryCount).toBe(1);
  });

  it('returns zero averages when every order is cancelled', () => {
    const kpis = computeSalesKpis([
      order({ id: '1', status: 'cancelled', total: 80, fulfillment_type: 'delivery' }),
    ]);

    expect(kpis.orderCount).toBe(1);
    expect(kpis.revenue).toBe(0);
    expect(kpis.averageOrderValue).toBe(0);
    expect(kpis.deliveryCount).toBe(0);
  });
});
