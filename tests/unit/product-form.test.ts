import { describe, it, expect } from 'vitest';
import {
  ecommerceProductFormSchema,
  productFormToInput,
  getDefaultProductFormValues,
  productToFormValues,
  getEcommerceDisplayPrice,
} from '@/lib/catalog/product-form';
import type { Product } from '@/types';

const categoryId = '550e8400-e29b-41d4-a716-446655440000';

describe('product-form (ecommerce)', () => {
  const validEcommerceForm = {
    category_id: categoryId,
    name_en: 'Wallet',
    name_ar: 'محفظة',
    description_en: '',
    description_ar: '',
    image_url: null,
    price: 199,
    is_available: true,
    is_popular: false,
    is_new: false,
    is_bestseller: false,
    sort_order: 0,
  };

  it('accepts ecommerce form with single price', () => {
    const result = ecommerceProductFormSchema.safeParse(validEcommerceForm);
    expect(result.success).toBe(true);
  });

  it('ecommerce schema does not include is_spicy', () => {
    expect('is_spicy' in ecommerceProductFormSchema.shape).toBe(false);
  });

  it('rejects negative ecommerce price', () => {
    const result = ecommerceProductFormSchema.safeParse({ ...validEcommerceForm, price: -1 });
    expect(result.success).toBe(false);
  });

  it('maps single price to both DB columns on save', () => {
    const input = productFormToInput(validEcommerceForm, true);
    expect(input.dining_price).toBe(199);
    expect(input.takeaway_price).toBe(199);
    expect(input.stock_qty).toBeNull();
    expect(input.is_available).toBe(true);
  });

  it('replaces stock with null, zero, or a positive integer and leaves availability alone', () => {
    const empty = productFormToInput({ ...validEcommerceForm, stock_qty: '' }, true);
    expect(empty.stock_qty).toBeNull();
    expect(empty.is_available).toBe(true);

    const zero = productFormToInput(
      { ...validEcommerceForm, stock_qty: '0', is_available: true },
      true
    );
    expect(zero.stock_qty).toBe(0);
    expect(zero.is_available).toBe(true);

    const five = productFormToInput({ ...validEcommerceForm, stock_qty: '5' }, true);
    expect(five.stock_qty).toBe(5);
    expect(five.is_available).toBe(true);

    expect(
      ecommerceProductFormSchema.safeParse({ ...validEcommerceForm, stock_qty: '-1' }).success
    ).toBe(false);
    expect(
      ecommerceProductFormSchema.safeParse({ ...validEcommerceForm, stock_qty: '1.5' }).success
    ).toBe(false);
  });

  it('always saves is_spicy false for ecommerce', () => {
    const input = productFormToInput(validEcommerceForm, true);
    expect(input.is_spicy).toBe(false);
  });

  it('returns default ecommerce form with price field only', () => {
    const defaults = getDefaultProductFormValues(true);
    expect(defaults).toMatchObject({ price: 0 });
    expect(defaults).not.toHaveProperty('dining_price');
    expect(defaults).not.toHaveProperty('takeaway_price');
    expect(defaults).not.toHaveProperty('is_spicy');
  });

  it('maps product to ecommerce form using dining_price', () => {
    const product = {
      id: '1',
      category_id: categoryId,
      name_en: 'Wallet',
      name_ar: 'محفظة',
      dining_price: 150,
      takeaway_price: 140,
      is_available: true,
      is_popular: false,
      is_new: false,
      is_bestseller: false,
      is_spicy: true,
      sort_order: 0,
      created_at: '',
      updated_at: '',
    } as Product;

    const form = productToFormValues({ ...product, stock_qty: null }, true);
    expect(form).toMatchObject({ price: 150, stock_qty: '' });

    const counted = productToFormValues({ ...product, stock_qty: 4 }, true);
    expect(counted).toMatchObject({ stock_qty: '4' });
    expect(form).not.toHaveProperty('is_spicy');
  });

  it('getEcommerceDisplayPrice prefers dining_price', () => {
    expect(getEcommerceDisplayPrice({ dining_price: 120, takeaway_price: 100 })).toBe(120);
  });
});

describe('product-form (restaurant)', () => {
  const validRestaurantForm = {
    category_id: categoryId,
    name_en: 'Hummus',
    name_ar: 'حمص',
    dining_price: 25,
    takeaway_price: 22,
    is_available: true,
    is_popular: false,
    is_new: false,
    is_bestseller: false,
    is_spicy: false,
    sort_order: 0,
  };

  it('passes through separate dining/takeaway prices', () => {
    const input = productFormToInput(validRestaurantForm, false);
    expect(input.dining_price).toBe(25);
    expect(input.takeaway_price).toBe(22);
    expect(input).not.toHaveProperty('stock_qty');
  });

  it('returns default restaurant form with both price fields', () => {
    const defaults = getDefaultProductFormValues(false);
    expect(defaults).toMatchObject({ dining_price: 0, takeaway_price: 0, is_spicy: false });
    expect(defaults).not.toHaveProperty('price');
  });

  it('maps a kilogram dish to price per kg and the smallest weight price', () => {
    const input = productFormToInput(
      {
        ...validRestaurantForm,
        use_weight_pricing: true,
        price_per_kg: 400,
        weight_options_g: '250, 1000',
      },
      false
    );
    expect(input.price_per_kg).toBe(400);
    expect(input.weight_options_g).toEqual([250, 1000]);
    expect(input.dining_price).toBe(100);
    expect(input.takeaway_price).toBe(100);
  });

  it('does not write kilogram fields for ecommerce', () => {
    const input = productFormToInput(
      {
        category_id: categoryId,
        name_en: 'Wallet',
        name_ar: 'محفظة',
        price: 199,
        is_available: true,
        is_popular: false,
        is_new: false,
        is_bestseller: false,
        sort_order: 0,
      },
      true
    );
    expect(input.price_per_kg).toBeUndefined();
    expect(input).not.toHaveProperty('use_weight_pricing');
    expect(input).not.toHaveProperty('weight_options_g');
  });
});
