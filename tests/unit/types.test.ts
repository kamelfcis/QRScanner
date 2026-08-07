import { describe, it, expect } from 'vitest';
import type {
  Category,
  Product,
  QrCode,
  RestaurantTable,
  RestaurantSettings,
  ImportJob,
  ImportExtractedData,
  ImportExtractedProduct,
  ImportExtractedCategory,
  Offer,
  Gallery,
} from '@/types/database';

describe('Category type', () => {
  it('has required fields', () => {
    const cat: Category = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name_en: 'Main',
      name_ar: 'رئيسي',
      description_en: null,
      description_ar: null,
      image_url: null,
      banner_url: null,
      sort_order: 0,
      is_visible: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    expect(cat.name_en).toBe('Main');
    expect(cat.is_visible).toBe(true);
  });

  it('allows nullable optional fields', () => {
    const cat: Category = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name_en: 'Test',
      name_ar: 'اختبار',
      description_en: null,
      description_ar: null,
      image_url: null,
      banner_url: null,
      sort_order: 0,
      is_visible: false,
      created_at: '',
      updated_at: '',
    };
    expect(cat.description_en).toBeNull();
    expect(cat.image_url).toBeNull();
  });
});

describe('Product type', () => {
  it('has pricing fields', () => {
    const prod: Product = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      category_id: '123e4567-e89b-12d3-a456-426614174001',
      subcategory_id: null,
      name_en: 'Kebab',
      name_ar: 'كباب',
      description_en: 'Grilled',
      description_ar: null,
      image_url: null,
      dining_price: 35,
      takeaway_price: 30,
      is_available: true,
      is_popular: false,
      is_new: false,
      is_bestseller: true,
      is_spicy: false,
      sort_order: 1,
      created_at: '',
      updated_at: '',
    };
    expect(prod.dining_price).toBe(35);
    expect(prod.takeaway_price).toBe(30);
    expect(prod.is_bestseller).toBe(true);
  });
});

describe('QrCode type', () => {
  it('has design fields', () => {
    const qr: QrCode = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Table 1',
      url: 'https://menu.wardashamya.com',
      template: 'golden',
      primary_color: '#B8860B',
      secondary_color: '#8B0000',
      background_color: '#FFFFFF',
      foreground_color: '#000000',
      size: 300,
      rounded_style: 'rounded',
      eye_style: 'circle',
      margin: 4,
      error_correction: 'M',
      logo_url: null,
      image_url: null,
      table_id: null,
      is_active: true,
      created_at: '',
      updated_at: '',
    };
    expect(qr.template).toBe('golden');
    expect(qr.is_active).toBe(true);
  });
});

describe('RestaurantTable type', () => {
  it('has required fields', () => {
    const table: RestaurantTable = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      table_number: 5,
      internal_name: 'Window Seat',
      description: 'Near window',
      is_active: true,
      created_at: '',
      updated_at: '',
    };
    expect(table.table_number).toBe(5);
    expect(table.internal_name).toBe('Window Seat');
  });
});

describe('ImportJob type', () => {
  it('has all status values', () => {
    const statuses: ImportJob['status'][] = [
      'uploading',
      'processing',
      'parsing',
      'preview',
      'importing',
      'completed',
      'failed',
    ];
    expect(statuses).toHaveLength(7);
    expect(statuses).toContain('preview');
    expect(statuses).toContain('completed');
  });

  it('has file type values', () => {
    const types: ImportJob['file_type'][] = ['pdf', 'png', 'jpeg', 'webp'];
    expect(types).toHaveLength(4);
  });
});

describe('ImportExtractedData type', () => {
  it('has restaurant and categories structure', () => {
    const data: ImportExtractedData = {
      restaurant: {
        name_en: 'Test Restaurant',
        name_ar: 'مطعم تست',
        phone: '+966500000000',
        primary_color: '#B8860B',
      },
      categories: [
        {
          name_en: 'Appetizers',
          name_ar: 'مقبلات',
          products: [
            {
              name_en: 'Hummus',
              name_ar: 'حمص',
              dining_price: 15,
              takeaway_price: 12,
              confidence: 0.9,
            },
          ],
          confidence: 0.85,
        },
      ],
      confidence: {
        overall: 0.88,
        restaurant: 0.9,
        categories: 0.85,
        products: 0.8,
      },
    };
    expect(data.categories!).toHaveLength(1);
    expect(data.categories![0].products).toHaveLength(1);
    expect(data.confidence!.overall).toBeGreaterThan(0.8);
  });
});

describe('Offer type', () => {
  it('has discount fields', () => {
    const offer: Offer = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title_en: 'Happy Hour',
      title_ar: 'ساعة سعيدة',
      description_en: '20% off',
      description_ar: 'خصم 20٪',
      image_url: null,
      discount_type: 'percentage',
      discount_value: 20,
      start_date: null,
      end_date: null,
      is_active: true,
      created_at: '',
      updated_at: '',
    };
    expect(offer.discount_type).toBe('percentage');
    expect(offer.discount_value).toBe(20);
  });
});

describe('Gallery type', () => {
  it('has image fields', () => {
    const item: Gallery = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      image_url: 'https://example.com/photo.jpg',
      caption_en: 'Our restaurant',
      caption_ar: 'مطعمنا',
      is_featured: true,
      sort_order: 1,
      is_visible: true,
      created_at: '',
    };
    expect(item.image_url).toContain('photo.jpg');
  });
});

describe('RestaurantSettings type', () => {
  it('has business fields', () => {
    const settings: RestaurantSettings = {
      name_en: 'Warda Shamya',
      name_ar: 'وردة شميا',
      phone: '+966500000000',
      whatsapp: '+966500000001',
      address_en: 'Riyadh',
      address_ar: 'الرياض',
      instagram: '@warda',
      facebook: 'warda',
      tiktok: 'warda',
      logo_url: null,
      hero_image_url: null,
      story_image_url: null,
      hero_headline: null,
      hero_subtitle: null,
      tagline: null,
      email: null,
      google_maps_url: null,
      currency: 'SAR',
      tax_rate: 15,
      service_charge_rate: 10,
      prep_time_minutes: 25,
      minimum_order: 0,
      max_order_notes_length: 200,
      apply_tax: true,
      apply_service_charge: true,
    };
    expect(settings.currency).toBe('SAR');
    expect(settings.tax_rate).toBe(15);
    expect(settings.prep_time_minutes).toBe(25);
    expect(settings.apply_tax).toBe(true);
  });
});
