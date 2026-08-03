import { describe, it, expect } from 'vitest';
import { categorySchema, productSchema, offerSchema, gallerySchema, loginSchema, settingsSchema, qrCodeSchema, restaurantTableSchema } from '@/types/schema';

describe('categorySchema edge cases', () => {
  it('rejects very long names', () => {
    const result = categorySchema.safeParse({ name_en: 'x'.repeat(256), name_ar: 'اختبار' });
    expect(result.success).toBe(false);
  });

  it('accepts max length names', () => {
    const result = categorySchema.safeParse({ name_en: 'x'.repeat(255), name_ar: 'اختبار' });
    expect(result.success).toBe(true);
  });

  it('accepts empty description', () => {
    const result = categorySchema.safeParse({ name_en: 'Test', name_ar: 'اختبار', description_en: '', description_ar: '' });
    expect(result.success).toBe(true);
  });

  it('rejects missing name_ar', () => {
    const result = categorySchema.safeParse({ name_en: 'Test' });
    expect(result.success).toBe(false);
  });
});

describe('productSchema edge cases', () => {
  it('accepts product with all fields', () => {
    const result = productSchema.safeParse({
      category_id: '123e4567-e89b-12d3-a456-426614174000',
      name_en: 'Kebab',
      name_ar: 'كباب',
      description_en: 'Grilled kebab',
      description_ar: 'كباب مشوي',
      dining_price: 35,
      takeaway_price: 30,
      is_available: true,
      is_popular: false,
      is_bestseller: true,
      is_spicy: false,
      sort_order: 1,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative dining price', () => {
    const result = productSchema.safeParse({
      category_id: '123e4567-e89b-12d3-a456-426614174000',
      name_en: 'Kebab',
      name_ar: 'كباب',
      dining_price: -5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative takeaway price', () => {
    const result = productSchema.safeParse({
      category_id: '123e4567-e89b-12d3-a456-426614174000',
      name_en: 'Kebab',
      name_ar: 'كباب',
      takeaway_price: -10,
    });
    expect(result.success).toBe(false);
  });

  it('accepts zero prices', () => {
    const result = productSchema.safeParse({
      category_id: '123e4567-e89b-12d3-a456-426614174000',
      name_en: 'Free Item',
      name_ar: 'عنصر مجاني',
      dining_price: 0,
      takeaway_price: 0,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const result = productSchema.safeParse({
      category_id: 'not-a-uuid',
      name_en: 'Kebab',
      name_ar: 'كباب',
    });
    expect(result.success).toBe(false);
  });

  it('defaults optional booleans', () => {
    const result = productSchema.safeParse({
      category_id: '123e4567-e89b-12d3-a456-426614174000',
      name_en: 'Kebab',
      name_ar: 'كباب',
    });
    if (result.success) {
      expect(result.data.is_available).toBe(true);
      expect(result.data.is_popular).toBe(false);
      expect(result.data.is_bestseller).toBe(false);
    }
  });
});

describe('offerSchema edge cases', () => {
  it('accepts fixed discount', () => {
    const result = offerSchema.safeParse({
      title_en: 'Flat Off',
      title_ar: 'خصم ثابت',
      discount_type: 'fixed',
      discount_value: 10,
    });
    expect(result.success).toBe(true);
  });

  it('accepts percentage discount', () => {
    const result = offerSchema.safeParse({
      title_en: 'Percent Off',
      title_ar: 'خصم نسبة',
      discount_type: 'percentage',
      discount_value: 25,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative discount', () => {
    const result = offerSchema.safeParse({
      title_en: 'Bad',
      title_ar: 'سيء',
      discount_type: 'percentage',
      discount_value: -5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects discount over 100 for percentage', () => {
    const result = offerSchema.safeParse({
      title_en: 'Too High',
      title_ar: 'مرتفع جدا',
      discount_type: 'percentage',
      discount_value: 150,
    });
    expect(result.success).toBe(false);
  });
});

describe('gallerySchema edge cases', () => {
  it('accepts valid gallery item', () => {
    const result = gallerySchema.safeParse({
      image_url: 'https://example.com/photo.jpg',
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

describe('loginSchema edge cases', () => {
  it('accepts valid login', () => {
    const result = loginSchema.safeParse({
      email: 'admin@example.com',
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
      email: 'admin@example.com',
      password: '123',
    });
    expect(result.success).toBe(false);
  });
});

describe('settingsSchema edge cases', () => {
  it('accepts valid settings', () => {
    const result = settingsSchema.safeParse({
      restaurant: { name_en: 'Test', name_ar: 'اختبار' },
      theme: {
        primary_color: '#B8860B',
        secondary_color: '#8B0000',
        accent_color: '#FFD700',
        background_color: '#FFFAF0',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing restaurant name', () => {
    const result = settingsSchema.safeParse({
      restaurant: {},
      theme: {
        primary_color: '#B8860B',
        secondary_color: '#8B0000',
        accent_color: '#FFD700',
        background_color: '#FFFAF0',
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid color in theme', () => {
    const result = settingsSchema.safeParse({
      restaurant: { name_en: 'Test', name_ar: 'اختبار' },
      theme: {
        primary_color: 'not-a-color',
        secondary_color: '#8B0000',
        accent_color: '#FFD700',
        background_color: '#FFFAF0',
      },
    });
    expect(result.success).toBe(false);
  });
});

describe('qrCodeSchema edge cases', () => {
  it('accepts valid QR code', () => {
    const result = qrCodeSchema.safeParse({
      name: 'Table 1',
      url: 'https://menu.wardashamya.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = qrCodeSchema.safeParse({
      name: '',
      url: 'https://menu.wardashamya.com',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid URL', () => {
    const result = qrCodeSchema.safeParse({
      name: 'Table 1',
      url: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('accepts table_id as UUID', () => {
    const result = qrCodeSchema.safeParse({
      name: 'Table 1',
      url: 'https://menu.wardashamya.com',
      table_id: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });

  it('accepts null table_id', () => {
    const result = qrCodeSchema.safeParse({
      name: 'Table 1',
      url: 'https://menu.wardashamya.com',
      table_id: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('restaurantTableSchema edge cases', () => {
  it('accepts valid table', () => {
    const result = restaurantTableSchema.safeParse({
      table_number: 1,
    });
    expect(result.success).toBe(true);
  });

  it('rejects zero table number', () => {
    const result = restaurantTableSchema.safeParse({
      table_number: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative table number', () => {
    const result = restaurantTableSchema.safeParse({
      table_number: -1,
    });
    expect(result.success).toBe(false);
  });

  it('accepts all optional fields', () => {
    const result = restaurantTableSchema.safeParse({
      table_number: 5,
      internal_name: 'VIP Table',
      description: 'Window seat with view',
      is_active: true,
    });
    expect(result.success).toBe(true);
  });
});
