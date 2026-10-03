import { calculateOrderTotals, getCartLineUnitPrice, type OrderTotals } from './totals';
import { getRestaurantCurrency } from './format-currency';
import { buildWhatsAppMessage, type MessageLocale } from './whatsapp-message';
import { getLocalizedText } from '@/lib/utils';
import { getSizeLabel, type ProductSizeId } from '@/lib/catalog/product-sizes';
import type { Order, OrderItem } from '@/types/database';
import { buildWhatsAppUrl } from './whatsapp-url';
import { resolvePrepTimeDisplay } from './prep-time';
import { isEcommerceStore } from '@/lib/store-config';
import type { CartItem, CartDiningMode, FulfillmentType } from '@/stores/cart-store';
import type { RestaurantSettings } from '@/types/database';

export interface BuildOrderInput {
  items: CartItem[];
  diningMode: CartDiningMode;
  tableNumber?: string | null;
  fulfillmentType?: FulfillmentType | null;
  deliveryAddress?: string | null;
  deliveryFee?: number | null;
  customerName: string;
  customerPhone?: string | null;
  orderNotes?: string | null;
  orderPaymentRef?: string | null;
  instapayProofReference?: string | null;
  instapayScreenshotUrl?: string | null;
  instapayHandle?: string | null;
  requiresInstapayProof?: boolean;
  locale: 'en' | 'ar';
  settings: Pick<
    RestaurantSettings,
    | 'whatsapp'
    | 'currency'
    | 'tax_rate'
    | 'service_charge_rate'
    | 'apply_tax'
    | 'apply_service_charge'
    | 'prep_time_minutes'
    | 'prep_time_days'
  >;
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
    unitPrice: getCartLineUnitPrice(
      {
        dining_price: item.dining_price,
        takeaway_price: item.takeaway_price,
        has_size_options: item.has_size_options ?? false,
        sizeOption: item.sizeOption ?? null,
        price_per_kg: item.price_per_kg,
        weightGrams: item.weightGrams,
      },
      input.diningMode
    ),
    name: formatCartItemName(item, input.locale),
  }));

  const totals = calculateOrderTotals(
    priced.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })),
    input.settings,
    input.deliveryFee ?? 0
  );

  const prepTime = resolvePrepTimeDisplay(input.settings);

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
    prepTimeMinutes: prepTime?.unit === 'minutes' ? prepTime.value : null,
    prepTimeDays: prepTime?.unit === 'days' ? prepTime.value : null,
    deliveryFee: totals.deliveryFee,
    ecommerceDelivery: isEcommerceStore,
    orderPaymentRef: input.orderPaymentRef,
    instapayProofReference: input.instapayProofReference,
    instapayScreenshotUrl: input.instapayScreenshotUrl,
    instapayHandle: input.instapayHandle,
    requiresInstapayProof: input.requiresInstapayProof,
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
    deliveryFee: Number(input.order.delivery_fee ?? 0),
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
    orderNumber: input.order.order_number,
  });

  const whatsappUrl = buildWhatsAppUrl(input.settings.whatsapp || '', message);
  return { totals, message, whatsappUrl, currency };
}

function formatWeightLabel(locale: MessageLocale, grams: number): string {
  if (locale === 'ar') return `${grams} جم`;
  if (locale === 'en') return `${grams}g`;
  return `${grams} g`;
}

function formatCartItemName(item: CartItem, locale: 'en' | 'ar'): string {
  const base = locale === 'ar' ? item.name_ar || item.name_en : item.name_en;
  if (item.weightGrams != null) {
    return `${base} (${formatWeightLabel(locale, item.weightGrams)})`;
  }
  return base;
}

function formatStoredItemName(item: OrderItem, locale: MessageLocale): string {
  const base = getLocalizedText(locale, {
    en: item.name_en,
    ar: item.name_ar,
    fr: item.name_fr,
    nl: item.name_nl,
  });
  let name = base;
  if (item.size_option) {
    name = `${name} (${getSizeLabel(locale, item.size_option as ProductSizeId)})`;
  }
  if (item.weight_grams != null) {
    name = `${name} (${formatWeightLabel(locale, item.weight_grams)})`;
  }
  return name;
}
