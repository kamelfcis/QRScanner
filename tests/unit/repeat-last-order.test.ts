import { describe, expect, it } from 'vitest';
import { buildRepeatCartItems, hasRepeatableLastOrder } from '@/lib/order/repeat-last-order';
import type { LastOrderLineItem } from '@/lib/order/last-order';
import type { Product } from '@/types/database';

const line: LastOrderLineItem = {
  productId: 'p1',
  name_en: 'Fish',
  name_ar: 'سمك',
  image_url: null,
  dining_price: 100,
  takeaway_price: 90,
  has_size_options: false,
  sizeOption: null,
  quantity: 2,
  notes: '',
};

const availableProduct: Product = {
  id: 'p1',
  category_id: 'c1',
  subcategory_id: null,
  name_ar: 'سمك',
  name_en: 'Fish',
  name_fr: null,
  name_nl: null,
  description_ar: null,
  description_en: null,
  description_fr: null,
  description_nl: null,
  image_url: null,
  dining_price: 100,
  takeaway_price: 90,
  has_size_options: false,
  price_per_kg: null,
  weight_options_g: null,
  is_available: true,
  is_popular: false,
  is_new: false,
  is_bestseller: false,
  is_spicy: false,
  sort_order: 0,
  created_at: '',
  updated_at: '',
};

describe('repeat-last-order', () => {
  it('adds available products', () => {
    const result = buildRepeatCartItems([line], [availableProduct]);
    expect(result.added).toHaveLength(1);
    expect(result.added[0].quantity).toBe(2);
    expect(result.skippedUnavailable).toHaveLength(0);
  });

  it('skips unavailable products', () => {
    const result = buildRepeatCartItems([line], [{ ...availableProduct, is_available: false }]);
    expect(result.added).toHaveLength(0);
    expect(result.skippedUnavailable).toHaveLength(1);
  });

  it('detects repeatable snapshots', () => {
    expect(hasRepeatableLastOrder({ orderNumber: 'AS-1', items: [line] })).toBe(true);
    expect(hasRepeatableLastOrder({ phone: '20100', items: [line] })).toBe(true);
    expect(hasRepeatableLastOrder({ orderNumber: 'AS-1' })).toBe(false);
  });
});
