import type { OrderTotals } from './totals';
import { formatCurrencyAmount } from './format-currency';
import type { FulfillmentType } from '@/stores/cart-store';

export type MessageLocale = 'en' | 'ar' | 'fr' | 'nl';
export type MessageDiningMode = 'dining' | 'takeaway';

export interface WhatsAppMessageItem {
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string | null;
}

export interface WhatsAppMessageInput {
  locale: MessageLocale;
  mode: MessageDiningMode;
  tableNumber?: string | number | null;
  fulfillmentType?: FulfillmentType | null;
  deliveryAddress?: string | null;
  items: WhatsAppMessageItem[];
  totals: OrderTotals;
  currency: string;
  customerName: string;
  customerPhone?: string | null;
  orderNotes?: string | null;
  prepTimeMinutes?: number | null;
  couponCode?: string | null;
}

const SEP = '────────────────';

function formatMoney(value: number, currency: string, locale: MessageLocale): string {
  return formatCurrencyAmount(value, currency, { locale, plain: true });
}

interface MessageLabels {
  headerDining: string;
  headerTakeaway: string;
  orderType: string;
  delivery: string;
  pickup: string;
  address: string;
  table: string;
  items: string;
  subtotal: string;
  discount: (code?: string | null) => string;
  tax: (rate: number) => string;
  service: (rate: number) => string;
  total: string;
  name: string;
  phone: string;
  orderNotes: string;
  prepTime: (minutes: number) => string;
}

const LABELS: Record<MessageLocale, MessageLabels> = {
  ar: {
    headerDining: '*طلب جديد — داخل المطعم*',
    headerTakeaway: '*طلب جديد — تيك أواي*',
    orderType: 'نوع الطلب',
    delivery: 'توصيل',
    pickup: 'استلام في المطعم',
    address: 'العنوان',
    table: 'الطاولة',
    items: '*الأصناف*',
    subtotal: 'المجموع الفرعي',
    discount: (code) => (code ? `الخصم (${code})` : 'الخصم'),
    tax: (rate) => `الضريبة (${rate}%)`,
    service: (rate) => `رسوم الخدمة (${rate}%)`,
    total: 'الإجمالي',
    name: 'الاسم',
    phone: 'الهاتف',
    orderNotes: 'ملاحظات الطلب',
    prepTime: (minutes) => `وقت التحضير المتوقع: ~${minutes} دقيقة`,
  },
  en: {
    headerDining: '*New Order — Dine In*',
    headerTakeaway: '*New Order — Takeaway*',
    orderType: 'Order type',
    delivery: 'Delivery',
    pickup: 'Pickup at restaurant',
    address: 'Address',
    table: 'Table',
    items: '*Items*',
    subtotal: 'Subtotal',
    discount: (code) => (code ? `Discount (${code})` : 'Discount'),
    tax: (rate) => `Tax (${rate}%)`,
    service: (rate) => `Service (${rate}%)`,
    total: 'Total',
    name: 'Name',
    phone: 'Phone',
    orderNotes: 'Order notes',
    prepTime: (minutes) => `Est. prep time: ~${minutes} min`,
  },
  fr: {
    headerDining: '*Nouvelle commande — Sur place*',
    headerTakeaway: '*Nouvelle commande — À emporter*',
    orderType: 'Type de commande',
    delivery: 'Livraison',
    pickup: 'Retrait au restaurant',
    address: 'Adresse',
    table: 'Table',
    items: '*Articles*',
    subtotal: 'Sous-total',
    discount: (code) => (code ? `Réduction (${code})` : 'Réduction'),
    tax: (rate) => `TVA (${rate}%)`,
    service: (rate) => `Service (${rate}%)`,
    total: 'Total',
    name: 'Nom',
    phone: 'Téléphone',
    orderNotes: 'Notes de commande',
    prepTime: (minutes) => `Temps de préparation estimé : ~${minutes} min`,
  },
  nl: {
    headerDining: '*Nieuwe bestelling — Ter plaatse*',
    headerTakeaway: '*Nieuwe bestelling — Afhalen*',
    orderType: 'Besteltype',
    delivery: 'Bezorging',
    pickup: 'Afhalen bij restaurant',
    address: 'Adres',
    table: 'Tafel',
    items: '*Artikelen*',
    subtotal: 'Subtotaal',
    discount: (code) => (code ? `Korting (${code})` : 'Korting'),
    tax: (rate) => `BTW (${rate}%)`,
    service: (rate) => `Service (${rate}%)`,
    total: 'Totaal',
    name: 'Naam',
    phone: 'Telefoon',
    orderNotes: 'Bestelnotities',
    prepTime: (minutes) => `Geschatte bereidingstijd: ~${minutes} min`,
  },
};

function fulfillmentLabel(locale: MessageLocale, fulfillmentType: FulfillmentType): string {
  const labels = LABELS[locale];
  return fulfillmentType === 'delivery' ? labels.delivery : labels.pickup;
}

function itemMultiplier(locale: MessageLocale): string {
  return locale === 'ar' ? '×' : 'x';
}

export function buildWhatsAppMessage(input: WhatsAppMessageInput): string {
  const {
    locale,
    mode,
    tableNumber,
    fulfillmentType,
    deliveryAddress,
    items,
    totals,
    currency,
    customerName,
    customerPhone,
    orderNotes,
    prepTimeMinutes,
    couponCode,
  } = input;

  const labels = LABELS[locale];
  const lines: string[] = [];
  const showFulfillment = mode === 'takeaway' && fulfillmentType;
  const multiplier = itemMultiplier(locale);

  lines.push(mode === 'dining' ? labels.headerDining : labels.headerTakeaway);
  lines.push(SEP);

  if (showFulfillment) {
    lines.push(`${labels.orderType}: ${fulfillmentLabel(locale, fulfillmentType)}`);
    if (fulfillmentType === 'delivery' && deliveryAddress?.trim()) {
      lines.push(`${labels.address}: ${deliveryAddress.trim()}`);
    }
    lines.push(SEP);
  } else if (tableNumber) {
    lines.push(`${labels.table}: ${tableNumber}`);
    lines.push(SEP);
  }

  lines.push(labels.items);
  for (const item of items) {
    const lineTotal = item.unitPrice * item.quantity;
    lines.push(
      `${item.quantity}${multiplier} ${item.name} — ${formatMoney(lineTotal, currency, locale)}`
    );
    if (item.notes?.trim()) {
      lines.push(`  • ${item.notes.trim()}`);
    }
  }

  lines.push(SEP);
  lines.push(`${labels.subtotal}: ${formatMoney(totals.subtotal, currency, locale)}`);
  if (totals.discount > 0) {
    lines.push(
      `${labels.discount(couponCode)}: −${formatMoney(totals.discount, currency, locale)}`
    );
  }
  if (totals.applyTax && totals.tax > 0) {
    lines.push(`${labels.tax(totals.taxRate)}: ${formatMoney(totals.tax, currency, locale)}`);
  }
  if (totals.applyService && totals.service > 0) {
    lines.push(
      `${labels.service(totals.serviceRate)}: ${formatMoney(totals.service, currency, locale)}`
    );
  }
  lines.push(`*${labels.total}: ${formatMoney(totals.total, currency, locale)}*`);

  lines.push(SEP);
  lines.push(`${labels.name}: ${customerName}`);
  if (customerPhone?.trim()) lines.push(`${labels.phone}: ${customerPhone.trim()}`);
  if (orderNotes?.trim()) lines.push(`${labels.orderNotes}: ${orderNotes.trim()}`);
  if (prepTimeMinutes != null && prepTimeMinutes > 0) {
    lines.push(labels.prepTime(prepTimeMinutes));
  }

  return lines.join('\n');
}
