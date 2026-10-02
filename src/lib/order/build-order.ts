import { calculateOrderTotals, getUnitPrice, type OrderTotals } from './totals';
import { getRestaurantCurrency } from './format-currency';
import { buildWhatsAppMessage } from './whatsapp-message';
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
    unitPrice: getUnitPrice(item.dining_price, item.takeaway_price, input.diningMode),
    name: input.locale === 'ar' ? item.name_ar || item.name_en : item.name_en,
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
