import { describe, it, expect } from 'vitest';
import {
  categorySchema,
  subcategorySchema,
  productSchema,
  offerSchema,
  gallerySchema,
  qrCodeSchema,
  loginSchema,
  type CategoryInput,
  type ProductInput,
  type OfferInput,
} from '@/types/schema';

describe('categorySchema', () => {
  const validCategory: CategoryInput = {
    name_en: 'Appetizers',
    name_ar: 'مقبلات',
    sort_order: 1,
    is_visible: true,
  };

  it('accepts valid category', () => {
    const result = categorySchema.safeParse(validCategory);
    expect(result.success).toBe(true);
  });

  it('rejects empty English name', () => {
    const result = categorySchema.safeParse({ ...validCategory, name_en: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty Arabic name', () => {
    const result = categorySchema.safeParse({ ...validCategory, name_ar: '' });
    expect(result.success).toBe(false);
  });

  it('accepts optional fields as undefined', () => {
    const result = categorySchema.safeParse({
      ...validCategory,
      description_en: undefined,
      description_ar: undefined,
      image_url: undefined,
      banner_url: undefined,
    });
    expect(result.success).toBe(true);
  });
});

describe('productSchema', () => {
  const validProduct: ProductInput = {
    category_id: '550e8400-e29b-41d4-a716-446655440000',
    name_en: 'Hummus',
    name_ar: 'حمص',
    dining_price: 25,
    takeaway_price: 22,
    is_available: true,
    is_popular: false,
    is_new: false,
    is_bestseller: false,
    is_spicy: false,
    sort_order: 1,
  };

  it('accepts valid product', () => {
    const result = productSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it('rejects negative dining price', () => {
    const result = productSchema.safeParse({ ...validProduct, dining_price: -5 });
    expect(result.success).toBe(false);
  });

  it('rejects negative takeaway price', () => {
    const result = productSchema.safeParse({ ...validProduct, takeaway_price: -1 });
    expect(result.success).toBe(false);
  });

  it('accepts zero prices', () => {
    const result = productSchema.safeParse({ ...validProduct, dining_price: 0, takeaway_price: 0 });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID for category_id', () => {
    const result = productSchema.safeParse({ ...validProduct, category_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});

describe('offerSchema', () => {
  const validOffer: OfferInput = {
    title_en: 'Happy Hour',
    title_ar: 'ساعة سعيدة',
    discount_type: 'percentage',
    discount_value: 20,
    is_active: true,
  };

  it('accepts valid offer', () => {
    const result = offerSchema.safeParse(validOffer);
    expect(result.success).toBe(true);
  });

  it('rejects negative discount', () => {
    const result = offerSchema.safeParse({ ...validOffer, discount_value: -10 });
    expect(result.success).toBe(false);
  });

  it('accepts fixed discount', () => {
    const result = offerSchema.safeParse({
      ...validOffer,
      discount_type: 'fixed',
      discount_value: 50,
    });
    expect(result.success).toBe(true);
  });
});

describe('gallerySchema', () => {
  it('accepts valid gallery item', () => {
    const result = gallerySchema.safeParse({
      image_url: 'https://example.com/image.jpg',
      sort_order: 1,
      is_visible: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid URL', () => {
    const result = gallerySchema.safeParse({
      image_url: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty image_url', () => {
    const result = gallerySchema.safeParse({
      image_url: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('qrCodeSchema', () => {
  it('accepts valid QR code', () => {
    const result = qrCodeSchema.safeParse({
      name: 'Table 1',
      url: 'https://menu.wardashamya.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid URL', () => {
    const result = qrCodeSchema.safeParse({
      name: 'Table 1',
      url: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid color', () => {
    const result = qrCodeSchema.safeParse({
      name: 'Table 1',
      url: 'https://menu.wardashamya.com',
      foreground_color: 'red',
    });
    expect(result.success).toBe(false);
  });

  it('rejects size below minimum', () => {
    const result = qrCodeSchema.safeParse({
      name: 'Table 1',
      url: 'https://menu.wardashamya.com',
      size: 50,
    });
    expect(result.success).toBe(false);
  });

  it('rejects size above maximum', () => {
    const result = qrCodeSchema.safeParse({
      name: 'Table 1',
      url: 'https://menu.wardashamya.com',
      size: 2000,
    });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid login', () => {
    const result = loginSchema.safeParse({
      email: 'admin@wardashamya.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = loginSchema.safeParse({
      email: 'admin@wardashamya.com',
      password: '12345',
    });
    expect(result.success).toBe(false);
  });
});

describe('subcategorySchema', () => {
  it('accepts valid subcategory', () => {
    const result = subcategorySchema.safeParse({
      category_id: '550e8400-e29b-41d4-a716-446655440000',
      name_en: 'Hot Appetizers',
      name_ar: 'مقبلات ساخنة',
      sort_order: 1,
      is_visible: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid category UUID', () => {
    const result = subcategorySchema.safeParse({
      category_id: 'invalid',
      name_en: 'Hot Appetizers',
      name_ar: 'مقبلات ساخنة',
    });
    expect(result.success).toBe(false);
  });
});
