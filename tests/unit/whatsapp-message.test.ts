import { describe, it, expect } from 'vitest';
import { buildOrderPayload, buildStoredOrderWhatsApp } from '@/lib/order/build-order';
import { buildWhatsAppMessage } from '@/lib/order/whatsapp-message';
import { buildWhatsAppUrl, normalizeWhatsAppPhone } from '@/lib/order/whatsapp-url';
import type { OrderTotals } from '@/lib/order/totals';
import type { CartItem } from '@/stores/cart-store';
import type { Order, OrderItem } from '@/types/database';

const totals: OrderTotals = {
  subtotal: 60,
  discount: 0,
  tax: 9,
  service: 6,
  deliveryFee: 0,
  total: 75,
  taxRate: 15,
  serviceRate: 10,
  applyTax: true,
  applyService: true,
};

describe('normalizeWhatsAppPhone', () => {
  it('strips non-digits', () => {
    expect(normalizeWhatsAppPhone('+966 50-000-0001')).toBe('966500000001');
  });
});

describe('buildWhatsAppUrl', () => {
  it('builds encoded wa.me url', () => {
    const url = buildWhatsAppUrl('+966500000001', 'Hello world');
    expect(url).toBe('https://wa.me/966500000001?text=Hello%20world');
  });

  it('normalizes Egyptian local restaurant numbers', () => {
    const url = buildWhatsAppUrl('01001234567', 'Hello');
    expect(url).toBe('https://wa.me/201001234567?text=Hello');
  });

  it('encodes newlines and arabic text', () => {
    const msg = 'طلب\nجديد';
    const url = buildWhatsAppUrl('966500000001', msg);
    expect(url).toContain(encodeURIComponent(msg));
  });
});

describe('buildWhatsAppMessage', () => {
  it('builds English dine-in message with table, notes, and totals', () => {
    const msg = buildWhatsAppMessage({
      locale: 'en',
      mode: 'dining',
      tableNumber: 5,
      items: [
        { name: 'Shawarma', quantity: 2, unitPrice: 25, notes: 'Extra garlic' },
        { name: 'Hummus', quantity: 1, unitPrice: 10 },
      ],
      totals,
      currency: 'SAR',
      customerName: 'Omar',
      customerPhone: '+966500000000',
      orderNotes: 'No spicy',
      prepTimeMinutes: 25,
    });

    expect(msg).toContain('*New Order — Dine In*');
    expect(msg).toContain('Table: 5');
    expect(msg).toContain('*Items*');
    expect(msg).toContain('2x Shawarma — 50 SAR');
    expect(msg).toContain('• Extra garlic');
    expect(msg).toContain('Subtotal: 60 SAR');
    expect(msg).toContain('Tax (15%): 9 SAR');
    expect(msg).toContain('Service (10%): 6 SAR');
    expect(msg).toContain('*Total: 75 SAR*');
    expect(msg).toContain('Name: Omar');
    expect(msg).toContain('Phone: +966500000000');
    expect(msg).toContain('Order notes: No spicy');
    expect(msg).toContain('Est. prep time: ~25 min');
  });

  it('includes a discount line with coupon code', () => {
    const msg = buildWhatsAppMessage({
      locale: 'en',
      mode: 'dining',
      items: [{ name: 'Shawarma', quantity: 2, unitPrice: 25 }],
      totals: { ...totals, discount: 6, tax: 8.1, service: 5.4, total: 67.5 },
      currency: 'EGP',
      customerName: 'Omar',
      couponCode: 'WELCOME10',
    });

    expect(msg).toContain('Subtotal: 60 EGP');
    expect(msg).toContain('Discount (WELCOME10): −6 EGP');
    expect(msg).toContain('*Total: 67.50 EGP*');
  });

  it('builds Arabic takeaway message', () => {
    const msg = buildWhatsAppMessage({
      locale: 'ar',
      mode: 'takeaway',
      items: [{ name: 'شاورما', quantity: 1, unitPrice: 22 }],
      totals: {
        ...totals,
        subtotal: 22,
        tax: 3.3,
        service: 0,
        total: 25.3,
        applyService: false,
      },
      currency: 'SAR',
      customerName: 'سارة',
      prepTimeMinutes: 20,
      orderNumber: 'HS-1042',
    });

    expect(msg).toContain('*طلب جديد — تيك أواي*');
    expect(msg).toContain('*رقم الطلب: HS-1042*');
    expect(msg).toContain('1× شاورما — 22 SAR');
    expect(msg).toContain('*الإجمالي:');
    expect(msg).toContain('الاسم: سارة');
    expect(msg).toContain('وقت التحضير المتوقع: ~20 دقيقة');
    expect(msg).not.toContain('رسوم الخدمة');
  });

  it('includes delivery address for takeaway delivery orders', () => {
    const msg = buildWhatsAppMessage({
      locale: 'ar',
      mode: 'takeaway',
      fulfillmentType: 'delivery',
      deliveryAddress: 'شارع النيل، المعادي، القاهرة',
      items: [{ name: 'جمبري', quantity: 2, unitPrice: 120 }],
      totals: {
        ...totals,
        subtotal: 240,
        tax: 36,
        service: 0,
        total: 276,
        applyService: false,
      },
      currency: 'EGP',
      customerName: 'أحمد',
      customerPhone: '01001234567',
    });

    expect(msg).toContain('نوع الطلب: توصيل');
    expect(msg).toContain('العنوان: شارع النيل، المعادي، القاهرة');
    expect(msg).not.toContain('الطاولة');
  });

  it('includes a delivery fee line after service when staff saved a fee', () => {
    const msg = buildWhatsAppMessage({
      locale: 'ar',
      mode: 'takeaway',
      fulfillmentType: 'delivery',
      deliveryAddress: 'المعادي',
      items: [{ name: 'جمبري', quantity: 1, unitPrice: 80 }],
      totals: {
        ...totals,
        subtotal: 80,
        tax: 0,
        service: 0,
        total: 105,
        applyTax: false,
        applyService: false,
      },
      currency: 'EGP',
      customerName: 'أحمد',
      deliveryFee: 25,
    });

    expect(msg).toContain('خدمة توصيل: 25 EGP');
    expect(msg).toContain('*الإجمالي: 105 EGP*');
  });

  it('includes pickup label without address for takeaway pickup orders', () => {
    const msg = buildWhatsAppMessage({
      locale: 'en',
      mode: 'takeaway',
      fulfillmentType: 'pickup',
      items: [{ name: 'Shrimp', quantity: 1, unitPrice: 80 }],
      totals: { ...totals, subtotal: 80, tax: 12, service: 0, total: 92, applyService: false },
      currency: 'EGP',
      customerName: 'Sara',
    });

    expect(msg).toContain('Order type: Pickup at restaurant');
    expect(msg).not.toContain('Address:');
  });
});

const orderSettings = {
  whatsapp: '+201001234567',
  currency: 'EGP',
  tax_rate: 0,
  service_charge_rate: 0,
  apply_tax: false,
  apply_service: false,
  prep_time_minutes: 25,
};

const baseCartItem: CartItem = {
  id: 'p1',
  productId: 'p1',
  name_en: 'Bouri',
  name_ar: 'بوري',
  image_url: null,
  dining_price: 120,
  takeaway_price: 120,
  has_size_options: false,
  sizeOption: null,
  quantity: 1,
  notes: '',
};

describe('WhatsApp weight labels', () => {
  it('includes English weight label from cart checkout payload', () => {
    const { message } = buildOrderPayload({
      items: [{ ...baseCartItem, weightGrams: 500 }],
      diningMode: 'takeaway',
      customerName: 'Omar',
      locale: 'en',
      settings: orderSettings,
    });

    expect(message).toContain('1x Bouri (500g) — 120 EGP');
  });

  it('includes Arabic weight label from cart checkout payload', () => {
    const { message } = buildOrderPayload({
      items: [{ ...baseCartItem, weightGrams: 500 }],
      diningMode: 'takeaway',
      customerName: 'أحمد',
      locale: 'ar',
      settings: orderSettings,
    });

    expect(message).toContain('1× بوري (500 جم) — 120 EGP');
  });

  it('includes size and weight together on cart items', () => {
    const { message } = buildOrderPayload({
      items: [
        {
          ...baseCartItem,
          name_en: 'Fish',
          name_ar: 'سمك',
          has_size_options: true,
          sizeOption: 'large',
          weightGrams: 1000,
        },
      ],
      diningMode: 'takeaway',
      customerName: 'Omar',
      locale: 'ar',
      settings: orderSettings,
    });

    expect(message).toContain('1× سمك (كبير) (1000 جم) — 120 EGP');
  });

  it('omits weight suffix when weightGrams is not set', () => {
    const { message } = buildOrderPayload({
      items: [baseCartItem],
      diningMode: 'takeaway',
      customerName: 'Omar',
      locale: 'en',
      settings: orderSettings,
    });

    expect(message).toContain('1x Bouri — 120 EGP');
    expect(message).not.toContain('(500g)');
  });

  it('includes weight label from stored order items', () => {
    const order: Order = {
      id: 'o1',
      order_number: '1001',
      status: 'pending',
      dining_mode: 'takeaway',
      fulfillment_type: 'pickup',
      table_number: null,
      customer_name: 'Omar',
      customer_phone: null,
      delivery_address: null,
      delivery_location_id: null,
      notes: null,
      subtotal: 450,
      tax: 0,
      service: 0,
      discount_amount: 0,
      coupon_id: null,
      coupon_code: null,
      delivery_fee: 0,
      total: 450,
      currency: 'EGP',
      whatsapp_sent: false,
      staff_acknowledged_at: null,
      locale: 'en',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    const items: OrderItem[] = [
      {
        id: 'oi1',
        order_id: 'o1',
        product_id: 'p1',
        name_en: 'Bouri',
        name_ar: 'بوري',
        name_fr: null,
        name_nl: null,
        quantity: 1,
        unit_price: 450,
        size_option: null,
        weight_grams: 1000,
        notes: null,
        created_at: '2026-01-01T00:00:00Z',
      },
    ];

    const { message } = buildStoredOrderWhatsApp({
      order,
      items,
      locale: 'en',
      settings: { whatsapp: '+201001234567', prep_time_minutes: 25 },
    });

    expect(message).toContain('1x Bouri (1000g) — 450 EGP');
    expect(message).toContain('*Order #: 1001*');
    expect(message).toContain('*Total: 450 EGP*');
  });
});
