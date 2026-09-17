import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { buildOrderReadyMessage } from '@/lib/order/whatsapp-message';
import {
  buildOrderReadyWhatsApp,
  openOrderReadyWhatsApp,
  shouldNotifyOrderReady,
} from '@/lib/order/ready-whatsapp';

vi.mock('@/i18n/config', () => ({
  hasHettSamakaTier1: true,
}));

describe('buildOrderReadyMessage', () => {
  it('builds Arabic-first ready message with order number and shop name', () => {
    const msg = buildOrderReadyMessage({
      locale: 'ar',
      orderNumber: 'ORD-0042',
      shopName: 'حت سمكة',
      fulfillmentType: 'pickup',
      diningMode: 'takeaway',
    });

    expect(msg).toContain('*طلبك جاهز*');
    expect(msg).toContain('حت سمكة');
    expect(msg).toContain('ORD-0042');
    expect(msg).toContain('جاهز للاستلام من المطعم');
  });

  it('uses delivery copy for delivery orders', () => {
    const msg = buildOrderReadyMessage({
      locale: 'en',
      orderNumber: 'ORD-0007',
      shopName: 'Hetta Samaka',
      fulfillmentType: 'delivery',
      diningMode: 'takeaway',
    });

    expect(msg).toContain('*Your order is ready*');
    expect(msg).toContain('Ready for delivery');
  });
});

describe('buildOrderReadyWhatsApp', () => {
  it('builds wa.me url to customer phone', () => {
    const built = buildOrderReadyWhatsApp({
      order: {
        order_number: 'ORD-0010',
        customer_phone: '01001234567',
        fulfillment_type: 'pickup',
        dining_mode: 'takeaway',
        ready_whatsapp_sent_at: null,
      },
      locale: 'ar',
      shopName: 'حت سمكة',
    });

    expect(built?.whatsappUrl).toMatch(/^https:\/\/wa\.me\/201001234567\?text=/);
    expect(built?.message).toContain('ORD-0010');
  });

  it('returns null without customer phone', () => {
    expect(
      buildOrderReadyWhatsApp({
        order: {
          order_number: 'ORD-0010',
          customer_phone: null,
          fulfillment_type: 'pickup',
          dining_mode: 'takeaway',
          ready_whatsapp_sent_at: null,
        },
        locale: 'en',
        shopName: 'Shop',
      })
    ).toBeNull();
  });
});

describe('shouldNotifyOrderReady', () => {
  it('requires phone, restaurant whatsapp, and setting enabled', () => {
    expect(
      shouldNotifyOrderReady({
        order: { customer_phone: '0100', ready_whatsapp_sent_at: null },
        settings: { whatsapp: '01001234567', whatsapp_on_ready: true },
      })
    ).toBe(true);

    expect(
      shouldNotifyOrderReady({
        order: { customer_phone: '0100', ready_whatsapp_sent_at: '2026-01-01T00:00:00Z' },
        settings: { whatsapp: '01001234567', whatsapp_on_ready: true },
      })
    ).toBe(false);

    expect(
      shouldNotifyOrderReady({
        order: { customer_phone: '0100', ready_whatsapp_sent_at: null },
        settings: { whatsapp: '', whatsapp_on_ready: true },
      })
    ).toBe(false);
  });
});

describe('openOrderReadyWhatsApp', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'open',
      vi.fn(() => ({ closed: false, opener: null }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens WhatsApp when eligible', () => {
    const opened = openOrderReadyWhatsApp({
      order: {
        order_number: 'ORD-0020',
        customer_phone: '01005551234',
        fulfillment_type: 'delivery',
        dining_mode: 'takeaway',
        ready_whatsapp_sent_at: null,
      },
      locale: 'ar',
      settings: {
        name_ar: 'حت سمكة',
        name_en: 'Hetta Samaka',
        whatsapp: '01001234567',
        whatsapp_on_ready: true,
      },
    });

    expect(opened).toBe(true);
    expect(window.open).toHaveBeenCalled();
  });
});
