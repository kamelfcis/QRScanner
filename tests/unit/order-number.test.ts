import { describe, expect, it } from 'vitest';
import { formatOrderNumber, normalizeOrderPrefix } from '@/lib/order/order-number';
import { placeOrderSchema } from '@/types/schema';

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
