import { describe, it, expect } from 'vitest';
import { calculateOrderTotals, getUnitPrice } from '@/lib/order/totals';
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
