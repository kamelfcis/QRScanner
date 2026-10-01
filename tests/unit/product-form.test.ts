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

    const form = productToFormValues(product, true);
    expect(form).toMatchObject({ price: 150 });
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
  });

  it('returns default restaurant form with both price fields', () => {
    const defaults = getDefaultProductFormValues(false);
    expect(defaults).toMatchObject({ dining_price: 0, takeaway_price: 0, is_spicy: false });
    expect(defaults).not.toHaveProperty('price');
  });
});
