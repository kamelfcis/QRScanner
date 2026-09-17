import { describe, expect, it } from 'vitest';
import {
  aggregateTopSelling,
  isTopSellingProduct,
  DEFAULT_TOP_SELLING_LIMIT,
} from '@/lib/order/top-selling';

describe('aggregateTopSelling', () => {
  it('sums quantities per product and ranks by total sold', () => {
    const rows = [
      { product_id: 'a', quantity: 2 },
      { product_id: 'b', quantity: 5 },
      { product_id: 'a', quantity: 3 },
      { product_id: 'c', quantity: 1 },
      { product_id: 'b', quantity: 1 },
    ];

    expect(aggregateTopSelling(rows)).toEqual([
      { product_id: 'b', quantity: 6 },
      { product_id: 'a', quantity: 5 },
      { product_id: 'c', quantity: 1 },
    ]);
  });

  it('respects limit and ignores invalid rows', () => {
    const rows = [
      { product_id: 'a', quantity: 10 },
      { product_id: 'b', quantity: 8 },
      { product_id: 'c', quantity: 6 },
      { product_id: '', quantity: 99 },
      { product_id: 'd', quantity: 0 },
    ];

    expect(aggregateTopSelling(rows, 2)).toEqual([
      { product_id: 'a', quantity: 10 },
      { product_id: 'b', quantity: 8 },
    ]);
    expect(DEFAULT_TOP_SELLING_LIMIT).toBe(5);
  });

  it('breaks ties by product id', () => {
    const rows = [
      { product_id: 'z', quantity: 4 },
      { product_id: 'a', quantity: 4 },
    ];

    expect(aggregateTopSelling(rows)).toEqual([
      { product_id: 'a', quantity: 4 },
      { product_id: 'z', quantity: 4 },
    ]);
  });
});

describe('isTopSellingProduct', () => {
  it('returns true when product is in top list', () => {
    expect(isTopSellingProduct('x', ['x', 'y'])).toBe(true);
    expect(isTopSellingProduct('z', ['x', 'y'])).toBe(false);
  });
});
