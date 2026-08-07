import { http, HttpResponse } from 'msw';

const API_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
const REST_BASE = `${API_BASE}/rest/v1`;

export const handlers = [
  http.get(`${REST_BASE}/categories`, () => {
    return HttpResponse.json([
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name_en: 'Appetizers',
        name_ar: 'مقبلات',
        sort_order: 1,
        is_visible: true,
        description_en: null,
        description_ar: null,
        image_url: null,
        banner_url: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name_en: 'Main Courses',
        name_ar: 'أطباق رئيسية',
        sort_order: 2,
        is_visible: true,
        description_en: null,
        description_ar: null,
        image_url: null,
        banner_url: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    ]);
  }),

  http.get(`${REST_BASE}/products`, () => {
    return HttpResponse.json([
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        name_en: 'Hummus',
        name_ar: 'حمص',
        description_en: 'Traditional hummus',
        description_ar: 'حمص تقليدي',
        dining_price: 25,
        takeaway_price: 22,
        is_available: true,
        is_popular: true,
        is_new: false,
        is_bestseller: false,
        is_spicy: false,
        sort_order: 1,
        category_id: '550e8400-e29b-41d4-a716-446655440001',
        subcategory_id: null,
        image_url: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        category: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name_en: 'Appetizers',
          name_ar: 'مقبلات',
        },
      },
    ]);
  }),

  http.get(`${REST_BASE}/offers`, () => {
    return HttpResponse.json([
      {
        id: '550e8400-e29b-41d4-a716-446655440020',
        title_en: 'Happy Hour',
        title_ar: 'ساعة سعيدة',
        description_en: '20% off all drinks',
        description_ar: 'خصم 20% على جميع المشروبات',
        discount_type: 'percentage',
        discount_value: 20,
        start_date: null,
        end_date: null,
        is_active: true,
        image_url: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    ]);
  }),

  http.get(`${REST_BASE}/gallery`, () => {
    return HttpResponse.json([
      {
        id: '550e8400-e29b-41d4-a716-446655440030',
        image_url: 'https://example.com/gallery/1.jpg',
        caption_en: 'Restaurant interior',
        caption_ar: 'المطعم من الداخل',
        sort_order: 1,
        is_visible: true,
        created_at: '2025-01-01T00:00:00Z',
      },
    ]);
  }),

  http.get(`${REST_BASE}/settings`, () => {
    return HttpResponse.json([
      {
        id: '550e8400-e29b-41d4-a716-446655440040',
        key: 'restaurant',
        value: {
          name_en: 'Warda Shamya',
          name_ar: 'وردة الشامية',
          phone: '+966500000000',
          whatsapp: '966500000001',
          currency: 'SAR',
          tax_rate: 15,
          service_charge_rate: 10,
          prep_time_minutes: 25,
          minimum_order: 0,
          max_order_notes_length: 200,
          apply_tax: true,
          apply_service_charge: true,
        },
        updated_at: '2025-01-01T00:00:00Z',
      },
    ]);
  }),
];
