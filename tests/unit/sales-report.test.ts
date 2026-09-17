import { describe, expect, it } from 'vitest';
import { getDateRange } from '@/hooks/useAnalytics';
import { computeSalesKpis } from '@/lib/order/sales-kpis';
import { resolveCustomSalesBounds } from '@/lib/order/sales-range';
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
    delivery_location_id: null,
    delivery_fee: 0,
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
    expect(kpis.cancelledCount).toBe(1);
    expect(kpis.revenue).toBe(300);
    expect(kpis.discounts).toBe(20);
    expect(kpis.averageOrderValue).toBe(150);
    expect(kpis.deliveryCount).toBe(1);
    expect(kpis.diningCount).toBe(0);
    expect(kpis.takeawayCount).toBe(2);
  });

  it('counts dining and takeaway on billable orders only', () => {
    const kpis = computeSalesKpis([
      order({ id: '1', dining_mode: 'dining', fulfillment_type: 'pickup' }),
      order({ id: '2', dining_mode: 'takeaway', fulfillment_type: 'delivery' }),
      order({ id: '3', status: 'cancelled', dining_mode: 'dining' }),
    ]);

    expect(kpis.diningCount).toBe(1);
    expect(kpis.takeawayCount).toBe(1);
  });

  it('returns zero averages when every order is cancelled', () => {
    const kpis = computeSalesKpis([
      order({ id: '1', status: 'cancelled', total: 80, fulfillment_type: 'delivery' }),
    ]);

    expect(kpis.orderCount).toBe(1);
    expect(kpis.cancelledCount).toBe(1);
    expect(kpis.revenue).toBe(0);
    expect(kpis.averageOrderValue).toBe(0);
    expect(kpis.deliveryCount).toBe(0);
  });
});

describe('getDateRange', () => {
  it('returns stable ISO bounds for year within the same day', () => {
    const first = getDateRange('year');
    const second = getDateRange('year');

    expect(first.start.toISOString()).toBe(second.start.toISOString());
    expect(first.end.toISOString()).toBe(second.end.toISOString());
  });

  it('starts the year range at Jan 1 00:00:00 local time', () => {
    const { start } = getDateRange('year');

    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
  });
});

describe('resolveCustomSalesBounds', () => {
  it('resolves custom from/to in local start/end of day', () => {
    const bounds = resolveCustomSalesBounds('2026-09-01', '2026-09-03');
    expect(bounds.ok).toBe(true);
    if (!bounds.ok) return;
    expect(bounds.start.getHours()).toBe(0);
    expect(bounds.start.getMinutes()).toBe(0);
    expect(bounds.end.getHours()).toBe(23);
    expect(bounds.end.getDate()).toBe(3);
    expect(bounds.start.toISOString()).not.toBe(bounds.end.toISOString());
  });

  it('rejects inverted and oversized custom ranges', () => {
    expect(resolveCustomSalesBounds('2026-09-10', '2026-09-01')).toEqual({
      ok: false,
      error: 'invalid_range',
    });
    expect(resolveCustomSalesBounds('2025-01-01', '2026-12-31')).toEqual({
      ok: false,
      error: 'range_too_wide',
    });
  });
});
