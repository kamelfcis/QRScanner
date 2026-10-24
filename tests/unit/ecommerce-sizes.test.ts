import { describe, expect, it } from 'vitest';
import {
  exceedsTrackedStock,
  isProductEffectivelySoldOut,
  lowStockLabelCount,
  maxAddableQuantity,
  type EcommerceProductSize,
} from '@/lib/catalog/ecommerce-sizes';

function size(partial: Partial<EcommerceProductSize> = {}): EcommerceProductSize {
  return {
    sort_order: 0,
    code: 'm',
    label_ar: 'وسط',
    label_en: 'Medium',
    price: 10,
    is_enabled: true,
    is_sold_out: false,
    ...partial,
  };
}

describe('isProductEffectivelySoldOut', () => {
  it('is sold out when unavailable, even if stock remains', () => {
    expect(isProductEffectivelySoldOut(false, [], 4)).toBe(true);
  });

  it('treats a zero or negative count as sold out without using availability', () => {
    expect(isProductEffectivelySoldOut(true, [], 0)).toBe(true);
    expect(isProductEffectivelySoldOut(true, [], -1)).toBe(true);
  });

  it('leaves null and missing stock unlimited', () => {
    expect(isProductEffectivelySoldOut(true, [], null)).toBe(false);
    expect(isProductEffectivelySoldOut(true, [])).toBe(false);
    expect(isProductEffectivelySoldOut(true, [], 6)).toBe(false);
  });

  it('stays sold out when every enabled size is sold out and stock is still positive', () => {
    const sizes = [size({ is_sold_out: true }), size({ code: 'l', is_enabled: false })];
    expect(isProductEffectivelySoldOut(true, sizes, 3)).toBe(true);
    expect(isProductEffectivelySoldOut(true, [size()], 3)).toBe(false);
  });
});

describe('stock quantity helpers', () => {
  it('shows a low-stock count only for 1 through 5', () => {
    expect(lowStockLabelCount(null)).toBeNull();
    expect(lowStockLabelCount(undefined)).toBeNull();
    expect(lowStockLabelCount(0)).toBeNull();
    expect(lowStockLabelCount(1)).toBe(1);
    expect(lowStockLabelCount(5)).toBe(5);
    expect(lowStockLabelCount(6)).toBeNull();
  });

  it('caps additional units at the remaining count', () => {
    expect(maxAddableQuantity(null, 4)).toBeNull();
    expect(maxAddableQuantity(3, 1)).toBe(2);
    expect(maxAddableQuantity(3, 3)).toBe(0);
  });

  it('flags a request that exceeds tracked stock', () => {
    expect(exceedsTrackedStock(null, 9)).toBe(false);
    expect(exceedsTrackedStock(3, 3)).toBe(false);
    expect(exceedsTrackedStock(3, 4)).toBe(true);
    expect(exceedsTrackedStock(0, 1)).toBe(true);
  });
});
