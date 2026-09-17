import { describe, expect, it } from 'vitest';
import { resolveEffectiveMinimumOrder } from '@/lib/order/delivery-min-order';

describe('resolveEffectiveMinimumOrder', () => {
  it('uses restaurant minimum when zone minimum is zero', () => {
    expect(resolveEffectiveMinimumOrder(50, { minimum_order: 0 })).toBe(50);
    expect(resolveEffectiveMinimumOrder(50, null)).toBe(50);
  });

  it('uses zone minimum when greater than zero', () => {
    expect(resolveEffectiveMinimumOrder(50, { minimum_order: 120 })).toBe(120);
  });
});
