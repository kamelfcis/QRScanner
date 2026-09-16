import { describe, expect, it } from 'vitest';
import { formatOrderNumber, normalizeOrderPrefix } from '@/lib/order/order-number';
import { placeOrderSchema, staffPlaceOrderSchema } from '@/types/schema';

describe('formatOrderNumber', () => {
  it('pads the sequence and uses a prefix', () => {
    expect(formatOrderNumber(42, 'GS')).toBe('GS-0042');
    expect(formatOrderNumber(1, 'ord')).toBe('ORD-0001');
  });

  it('falls back to ORD for empty prefixes', () => {
    expect(normalizeOrderPrefix('')).toBe('ORD');
    expect(formatOrderNumber(7, '!!!')).toBe('ORD-0007');
  });
});

describe('placeOrderSchema', () => {
  it('accepts a valid customer payload', () => {
    const result = placeOrderSchema.safeParse({
      items: [{ product_id: '123e4567-e89b-12d3-a456-426614174000', quantity: 2 }],
      dining_mode: 'dining',
      customer_name: 'Ali',
      locale: 'en',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty cart', () => {
    const result = placeOrderSchema.safeParse({
      items: [],
      dining_mode: 'takeaway',
      customer_name: 'Ali',
    });
    expect(result.success).toBe(false);
  });
});

describe('staffPlaceOrderSchema', () => {
  const productId = '123e4567-e89b-12d3-a456-426614174000';

  it('accepts a staff payload without whatsapp_sent', () => {
    const result = staffPlaceOrderSchema.safeParse({
      items: [{ product_id: productId, quantity: 1, weight_grams: 500 }],
      dining_mode: 'takeaway',
      fulfillment_type: 'pickup',
      customer_name: 'Walk-in',
      locale: 'ar',
      coupon_code: 'save10',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.coupon_code).toBe('SAVE10');
  });

  it('rejects delivery without delivery_location_id', () => {
    const result = staffPlaceOrderSchema.safeParse({
      items: [{ product_id: productId, quantity: 1 }],
      dining_mode: 'takeaway',
      fulfillment_type: 'delivery',
      customer_name: 'Ali',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'address_required')).toBe(true);
    }
  });
});
