import { describe, it, expect } from 'vitest';
import { calculateOrderTotals, getCartLineUnitPrice, getUnitPrice } from '@/lib/order/totals';
import { validateOrder } from '@/lib/order/validation';

describe('calculateOrderTotals', () => {
  const items = [
    { quantity: 2, unitPrice: 25 },
    { quantity: 1, unitPrice: 10 },
  ];

  it('computes subtotal, tax, service, and total', () => {
    const totals = calculateOrderTotals(items, {
      tax_rate: 15,
      service_charge_rate: 10,
      apply_tax: true,
      apply_service_charge: true,
    });
    expect(totals.subtotal).toBe(60);
    expect(totals.tax).toBe(9);
    expect(totals.service).toBe(6);
    expect(totals.total).toBe(75);
  });

  it('applies a percentage coupon to subtotal then tax and service', () => {
    const totals = calculateOrderTotals(
      items,
      {
        tax_rate: 15,
        service_charge_rate: 10,
        apply_tax: true,
        apply_service_charge: true,
      },
      { type: 'percentage', value: 10 }
    );
    expect(totals.subtotal).toBe(60);
    expect(totals.discount).toBe(6);
    expect(totals.tax).toBe(8.1);
    expect(totals.service).toBe(5.4);
    expect(totals.total).toBe(67.5);
  });

  it('applies a fixed coupon and never exceeds subtotal', () => {
    const totals = calculateOrderTotals(
      items,
      {
        tax_rate: 15,
        service_charge_rate: 10,
        apply_tax: true,
        apply_service_charge: true,
      },
      { type: 'fixed', value: 20 }
    );
    expect(totals.discount).toBe(20);
    expect(totals.tax).toBe(6);
    expect(totals.service).toBe(4);
    expect(totals.total).toBe(50);
  });

  it('caps percentage coupons with maxDiscount', () => {
    const totals = calculateOrderTotals(
      items,
      {
        tax_rate: 0,
        service_charge_rate: 0,
        apply_tax: false,
        apply_service_charge: false,
      },
      { type: 'percentage', value: 50, maxDiscount: 10 }
    );
    expect(totals.discount).toBe(10);
    expect(totals.total).toBe(50);
  });

  it('does not discount above the merchandise subtotal', () => {
    const totals = calculateOrderTotals(
      items,
      {
        apply_tax: false,
        apply_service_charge: false,
      },
      { type: 'fixed', value: 999 }
    );
    expect(totals.discount).toBe(60);
    expect(totals.total).toBe(0);
  });

  it('skips tax when apply_tax is false', () => {
    const totals = calculateOrderTotals(items, {
      tax_rate: 15,
      service_charge_rate: 10,
      apply_tax: false,
      apply_service_charge: true,
    });
    expect(totals.tax).toBe(0);
    expect(totals.service).toBe(6);
    expect(totals.total).toBe(66);
  });

  it('skips service when apply_service_charge is false', () => {
    const totals = calculateOrderTotals(items, {
      tax_rate: 15,
      service_charge_rate: 10,
      apply_tax: true,
      apply_service_charge: false,
    });
    expect(totals.tax).toBe(9);
    expect(totals.service).toBe(0);
    expect(totals.total).toBe(69);
  });

  it('defaults to applying tax and service', () => {
    const totals = calculateOrderTotals(items, {
      tax_rate: 15,
      service_charge_rate: 10,
    });
    expect(totals.applyTax).toBe(true);
    expect(totals.applyService).toBe(true);
    expect(totals.total).toBe(75);
  });
});

describe('getUnitPrice', () => {
  it('returns dining or takeaway price by mode', () => {
    expect(getUnitPrice(30, 25, 'dining')).toBe(30);
    expect(getUnitPrice(30, 25, 'takeaway')).toBe(25);
  });
});

describe('getCartLineUnitPrice', () => {
  const sizedItem = {
    dining_price: 70,
    takeaway_price: 110,
    has_size_options: true,
    sizeOption: 'small' as const,
  };

  it('uses small/large prices when size options enabled', () => {
    expect(getCartLineUnitPrice(sizedItem, 'takeaway')).toBe(70);
    expect(getCartLineUnitPrice({ ...sizedItem, sizeOption: 'large' }, 'dining')).toBe(110);
  });

  it('falls back to dining mode when size options disabled', () => {
    expect(
      getCartLineUnitPrice(
        { dining_price: 30, takeaway_price: 25, has_size_options: false, sizeOption: null },
        'takeaway'
      )
    ).toBe(25);
  });
});

describe('validateOrder min order', () => {
  it('fails when subtotal is below minimum', () => {
    const result = validateOrder({
      customerName: 'Ali',
      subtotal: 20,
      minimumOrder: 50,
      whatsappConfigured: true,
      hasItems: true,
    });
    expect(result.valid).toBe(false);
    expect(result.codes).toContain('min_order');
  });

  it('passes when subtotal meets minimum', () => {
    const result = validateOrder({
      customerName: 'Ali',
      subtotal: 50,
      minimumOrder: 50,
      whatsappConfigured: true,
      hasItems: true,
    });
    expect(result.valid).toBe(true);
  });
});

describe('validateOrder WhatsApp optional', () => {
  it('blocks missing WhatsApp by default', () => {
    const result = validateOrder({
      customerName: 'Ali',
      subtotal: 50,
      whatsappConfigured: false,
      hasItems: true,
    });
    expect(result.valid).toBe(false);
    expect(result.codes).toContain('whatsapp_missing');
  });

  it('allows missing WhatsApp when requireWhatsApp is false', () => {
    const result = validateOrder({
      customerName: 'Ali',
      subtotal: 50,
      whatsappConfigured: false,
      requireWhatsApp: false,
      hasItems: true,
    });
    expect(result.valid).toBe(true);
    expect(result.codes).not.toContain('whatsapp_missing');
  });
});
