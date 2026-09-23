import { describe, expect, it } from 'vitest';
import { computeDailyOpsBreakdown } from '@/lib/order/shift-daily-breakdown';
import type { Order, OrderItem } from '@/types/database';

function order(partial: Partial<Order> & Pick<Order, 'id' | 'total'>): Order {
  return {
    order_number: 'T-1',
    status: 'completed',
    dining_mode: 'dining',
    fulfillment_type: null,
    table_number: null,
    customer_name: 'Guest',
    customer_phone: null,
    delivery_address: null,
    delivery_location_id: null,
    notes: null,
    subtotal: partial.total,
    tax: 0,
    service: 0,
    discount_amount: 0,
    coupon_id: null,
    coupon_code: null,
    delivery_fee: 0,
    currency: 'EGP',
    whatsapp_sent: false,
    staff_acknowledged_at: null,
    locale: 'ar',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...partial,
  };
}

describe('computeDailyOpsBreakdown', () => {
  it('splits online vs cashier and excludes voids from net', () => {
    const orders = [
      order({ id: 'a', total: 100, payment_method: 'cash' }),
      order({ id: 'b', total: 50 }),
      order({ id: 'c', total: 80, status: 'cancelled', void_reason: 'mistake' }),
    ];
    const items = new Map<string, OrderItem[]>([
      [
        'a',
        [
          {
            id: 'i1',
            order_id: 'a',
            product_id: null,
            name_ar: 'x',
            name_en: 'x',
            name_fr: null,
            name_nl: null,
            quantity: 1,
            unit_price: 20,
            size_option: null,
            notes: null,
            voided_at: new Date().toISOString(),
            void_reason: 'wrong',
            created_at: new Date().toISOString(),
          },
        ],
      ],
    ]);

    const breakdown = computeDailyOpsBreakdown(orders, items, 10);

    expect(breakdown.cashierOrderCount).toBe(1);
    expect(breakdown.onlineOrderCount).toBe(1);
    expect(breakdown.cashTotal).toBe(80);
    expect(breakdown.voidTotal).toBe(100);
    expect(breakdown.netRevenue).toBe(120);
  });
});
