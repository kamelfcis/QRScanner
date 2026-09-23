import { describe, expect, it } from 'vitest';
import {
  computeChangeDue,
  isValidCashReceived,
  parseAmountReceived,
} from '@/lib/order/payment-close';

describe('payment close helpers', () => {
  it('computes change for cash payments', () => {
    expect(computeChangeDue(120, 150)).toBe(30);
    expect(computeChangeDue(120, 120)).toBe(0);
  });

  it('validates cash received against total', () => {
    expect(isValidCashReceived(100, 99.99)).toBe(false);
    expect(isValidCashReceived(100, 100)).toBe(true);
  });

  it('parses amount received input', () => {
    expect(parseAmountReceived('150.5')).toBe(150.5);
    expect(parseAmountReceived('bad')).toBeNull();
  });
});
