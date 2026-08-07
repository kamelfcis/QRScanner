import { describe, it, expect } from 'vitest';
import { buildWhatsAppMessage } from '@/lib/order/whatsapp-message';
import { buildWhatsAppUrl, normalizeWhatsAppPhone } from '@/lib/order/whatsapp-url';
import type { OrderTotals } from '@/lib/order/totals';

const totals: OrderTotals = {
  subtotal: 60,
  tax: 9,
  service: 6,
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
    expect(msg).toContain('2x Shawarma — 50 SAR');
    expect(msg).toContain('Note: Extra garlic');
    expect(msg).toContain('Subtotal: 60 SAR');
    expect(msg).toContain('Tax (15%): 9 SAR');
    expect(msg).toContain('Service (10%): 6 SAR');
    expect(msg).toContain('*Total: 75 SAR*');
    expect(msg).toContain('Name: Omar');
    expect(msg).toContain('Phone: +966500000000');
    expect(msg).toContain('Order notes: No spicy');
    expect(msg).toContain('Est. prep time: ~25 min');
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
    });

    expect(msg).toContain('*طلب جديد — تيك أواي*');
    expect(msg).toContain('1× شاورما — 22 SAR');
    expect(msg).toContain('الاسم: سارة');
    expect(msg).toContain('وقت التحضير المتوقع: ~20 دقيقة');
    expect(msg).not.toContain('رسوم الخدمة');
  });
});
