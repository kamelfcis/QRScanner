import {
  calculateOrderTotals,
  getCartLineUnitPrice,
  type CouponDiscountInput,
  type OrderTotals,
} from './totals';
import { getRestaurantCurrency } from './format-currency';
import { buildWhatsAppMessage, type MessageLocale } from './whatsapp-message';
import { getLocalizedText } from '@/lib/utils';
import { buildWhatsAppUrl } from './whatsapp-url';
import type { CartItem, CartDiningMode, FulfillmentType } from '@/stores/cart-store';
import type { Order, OrderItem, RestaurantSettings } from '@/types/database';

export interface BuildOrderInput {
  items: CartItem[];
  diningMode: CartDiningMode;
  tableNumber?: string | null;
  fulfillmentType?: FulfillmentType | null;
  deliveryAddress?: string | null;
  customerName: string;
  customerPhone?: string | null;
  orderNotes?: string | null;
  locale: MessageLocale;
  settings: Pick<
    RestaurantSettings,
    | 'whatsapp'
    | 'currency'
    | 'tax_rate'
    | 'service_charge_rate'
    | 'apply_tax'
    | 'apply_service_charge'
    | 'prep_time_minutes'
  >;
  coupon?: CouponDiscountInput | null;
  couponCode?: string | null;
}

export interface BuiltOrder {
  totals: OrderTotals;
  message: string;
  whatsappUrl: string;
  currency: string;
}

export function buildOrderPayload(input: BuildOrderInput): BuiltOrder {
  const currency = getRestaurantCurrency(input.settings.currency);
  const priced = input.items.map((item) => ({
    ...item,
    unitPrice: getCartLineUnitPrice(item, input.diningMode),
    name: formatCartItemName(item, input.locale),
  }));

  const totals = calculateOrderTotals(
    priced.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
    input.settings,
    input.coupon
  );

  const message = buildWhatsAppMessage({
    locale: input.locale,
    mode: input.diningMode,
    tableNumber: input.tableNumber,
    fulfillmentType: input.fulfillmentType,
    deliveryAddress: input.deliveryAddress,
    items: priced.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      notes: i.notes,
    })),
    totals,
    currency,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    orderNotes: input.orderNotes,
    prepTimeMinutes: input.settings.prep_time_minutes ?? 25,
    couponCode: input.couponCode,
  });

  const whatsappUrl = buildWhatsAppUrl(input.settings.whatsapp || '', message);

  return { totals, message, whatsappUrl, currency };
}

export function openWhatsAppUrl(url: string): boolean {
  // Do not pass "noopener" as a window feature — modern browsers then return null
  // even when the tab opened, which would falsely trigger same-tab fallback.
  const popup = window.open(url, '_blank');
  if (!popup || popup.closed) {
    window.location.href = url;
    return false;
  }
  try {
    popup.opener = null;
  } catch {
    // ignore
  }
  return true;
}

const SIZE_LABELS: Record<MessageLocale, { small: string; large: string }> = {
  ar: { small: 'صغير', large: 'كبير' },
  en: { small: 'Small', large: 'Large' },
  fr: { small: 'Petit', large: 'Grand' },
  nl: { small: 'Klein', large: 'Groot' },
};

export function buildStoredOrderWhatsApp(input: {
  order: Order;
  items: OrderItem[];
  locale: MessageLocale;
  settings: Pick<RestaurantSettings, 'whatsapp' | 'prep_time_minutes'>;
}): BuiltOrder {
  const currency = getRestaurantCurrency(input.order.currency);
  const totals: OrderTotals = {
    subtotal: Number(input.order.subtotal),
    discount: Number(input.order.discount_amount ?? 0),
    tax: Number(input.order.tax),
    service: Number(input.order.service),
    total: Number(input.order.total),
    taxRate: 0,
    serviceRate: 0,
    applyTax: Number(input.order.tax) > 0,
    applyService: Number(input.order.service) > 0,
  };

  const message = buildWhatsAppMessage({
    locale: input.locale,
    mode: input.order.dining_mode,
    tableNumber: input.order.table_number,
    fulfillmentType: input.order.fulfillment_type,
    deliveryAddress: input.order.delivery_address,
    items: input.items.map((item) => ({
      name: formatStoredItemName(item, input.locale),
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
      notes: item.notes,
    })),
    totals,
    currency,
    customerName: input.order.customer_name,
    customerPhone: input.order.customer_phone,
    orderNotes: input.order.notes,
    prepTimeMinutes: input.settings.prep_time_minutes ?? 25,
    couponCode: input.order.coupon_code,
    deliveryFee: Number(input.order.delivery_fee ?? 0),
  });

  const whatsappUrl = buildWhatsAppUrl(input.settings.whatsapp || '', message);
  return { totals, message, whatsappUrl, currency };
}

function formatStoredItemName(item: OrderItem, locale: MessageLocale): string {
  const base = getLocalizedText(locale, {
    en: item.name_en,
    ar: item.name_ar,
    fr: item.name_fr,
    nl: item.name_nl,
  });
  if (item.size_option) {
    return `${base} (${SIZE_LABELS[locale][item.size_option]})`;
  }
  return base;
}

function formatCartItemName(item: CartItem, locale: MessageLocale): string {
  const base = getLocalizedText(locale, {
    en: item.name_en,
    ar: item.name_ar,
    fr: item.name_fr,
    nl: item.name_nl,
  });
  if (item.has_size_options && item.sizeOption) {
    const sizeLabel = SIZE_LABELS[locale][item.sizeOption];
    return `${base} (${sizeLabel})`;
  }
  return base;
}
