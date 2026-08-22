import { afterEach, describe, expect, it } from 'vitest';
import {
  LAST_ORDER_STORAGE_KEY,
  buildOrderStatusPath,
  isLastOrderSnapshot,
  matchLastOrder,
  normalizeOrderQuery,
  phonesMatch,
  readLastOrder,
  writeLastOrder,
  type LastOrderSnapshot,
} from '@/lib/order/last-order';

const sample: LastOrderSnapshot = {
  orderNumber: 'AS-0042',
  orderId: '11111111-1111-1111-1111-111111111111',
  phone: '201501534655',
  customerName: 'Mona',
  status: 'new',
  diningMode: 'takeaway',
  fulfillmentType: 'pickup',
  placedAt: '2026-08-22T12:00:00.000Z',
  total: 85,
  currency: 'EGP',
};

afterEach(() => {
  window.localStorage.removeItem(LAST_ORDER_STORAGE_KEY);
});

describe('normalizeOrderQuery', () => {
  it('trims spaces and uppercases', () => {
    expect(normalizeOrderQuery(' as-42 ')).toBe('AS-42');
  });
});

describe('phonesMatch', () => {
  it('matches local vs international digits', () => {
    expect(phonesMatch('201501534655', '1501534655')).toBe(true);
    expect(phonesMatch('+20 150 153 4655', '01501534655')).toBe(true);
  });

  it('rejects a different number', () => {
    expect(phonesMatch('201501534655', '201000000000')).toBe(false);
    expect(phonesMatch(null, '1501534655')).toBe(false);
  });
});

describe('matchLastOrder', () => {
  it('matches phone only against this-device snapshot', () => {
    expect(matchLastOrder(sample, { phone: '1501534655' })).toBe(true);
  });

  it('matches order number case-insensitively', () => {
    expect(matchLastOrder(sample, { orderNumber: 'as-0042' })).toBe(true);
  });

  it('requires both when both are provided', () => {
    expect(matchLastOrder(sample, { orderNumber: 'AS-0042', phone: '1501534655' })).toBe(true);
    expect(matchLastOrder(sample, { orderNumber: 'AS-0042', phone: '1000000000' })).toBe(false);
    expect(matchLastOrder(sample, { orderNumber: 'AS-0099', phone: '1501534655' })).toBe(false);
  });

  it('does not match an empty query or missing snapshot', () => {
    expect(matchLastOrder(sample, {})).toBe(false);
    expect(matchLastOrder(null, { phone: '1501534655' })).toBe(false);
  });
});

describe('last-order storage', () => {
  it('round-trips a snapshot', () => {
    writeLastOrder(sample);
    expect(readLastOrder()).toEqual(sample);
  });

  it('rejects junk', () => {
    expect(isLastOrderSnapshot({ foo: 1 })).toBe(false);
    expect(isLastOrderSnapshot({ orderNumber: '  ' })).toBe(false);
  });
});

describe('buildOrderStatusPath', () => {
  it('puts the order number in the query and never a phone', () => {
    expect(buildOrderStatusPath('as-0042')).toBe('/order-status?order=AS-0042');
    expect(buildOrderStatusPath('')).toBe('/order-status');
  });
});
