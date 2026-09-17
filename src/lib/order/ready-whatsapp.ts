import { openWhatsAppUrl } from './build-order';
import { buildOrderReadyMessage, type MessageLocale } from './whatsapp-message';
import { buildWhatsAppUrl, normalizeWhatsAppPhone } from './whatsapp-url';
import { hasHettSamakaTier1 } from '@/i18n/config';
import { getLocalizedText } from '@/lib/utils';
import type { Order, RestaurantSettings } from '@/types/database';

export function isRestaurantWhatsAppConfigured(
  settings: Pick<RestaurantSettings, 'whatsapp'> | undefined
): boolean {
  return Boolean(normalizeWhatsAppPhone(settings?.whatsapp || ''));
}

export function buildOrderReadyWhatsApp(input: {
  order: Pick<
    Order,
    | 'order_number'
    | 'customer_phone'
    | 'fulfillment_type'
    | 'dining_mode'
    | 'ready_whatsapp_sent_at'
  >;
  locale: MessageLocale;
  shopName: string;
}): { message: string; whatsappUrl: string } | null {
  const phone = input.order.customer_phone?.trim();
  if (!phone) return null;

  const message = buildOrderReadyMessage({
    locale: input.locale,
    orderNumber: input.order.order_number,
    shopName: input.shopName,
    fulfillmentType: input.order.fulfillment_type,
    diningMode: input.order.dining_mode,
  });

  return { message, whatsappUrl: buildWhatsAppUrl(phone, message) };
}

export function shouldNotifyOrderReady(input: {
  order: Pick<Order, 'customer_phone' | 'ready_whatsapp_sent_at'>;
  settings: Pick<RestaurantSettings, 'whatsapp' | 'whatsapp_on_ready'> | undefined;
}): boolean {
  if (!hasHettSamakaTier1) return false;
  if (input.settings?.whatsapp_on_ready === false) return false;
  if (!input.order.customer_phone?.trim()) return false;
  if (!isRestaurantWhatsAppConfigured(input.settings)) return false;
  if (input.order.ready_whatsapp_sent_at) return false;
  return true;
}

export function openOrderReadyWhatsApp(input: {
  order: Pick<
    Order,
    | 'order_number'
    | 'customer_phone'
    | 'fulfillment_type'
    | 'dining_mode'
    | 'ready_whatsapp_sent_at'
  >;
  locale: MessageLocale;
  settings: Pick<RestaurantSettings, 'name_ar' | 'name_en' | 'whatsapp' | 'whatsapp_on_ready'>;
}): boolean {
  if (!shouldNotifyOrderReady({ order: input.order, settings: input.settings })) return false;

  const shopName = getLocalizedText(input.locale, {
    ar: input.settings.name_ar,
    en: input.settings.name_en,
    fr: input.settings.name_en,
    nl: input.settings.name_en,
  });

  const built = buildOrderReadyWhatsApp({
    order: input.order,
    locale: input.locale,
    shopName,
  });
  if (!built) return false;

  openWhatsAppUrl(built.whatsappUrl);
  return true;
}
