import type { OrderTotals } from './totals';
import { formatCurrencyAmount } from './format-currency';
import type { FulfillmentType } from '@/stores/cart-store';

export type MessageLocale = 'en' | 'ar';
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
}

const SEP = '────────────────';

function formatMoney(value: number, currency: string, locale: MessageLocale): string {
  return formatCurrencyAmount(value, currency, { locale, plain: true });
}

function fulfillmentLabel(locale: MessageLocale, fulfillmentType: FulfillmentType): string {
  if (locale === 'ar') {
    return fulfillmentType === 'delivery' ? 'توصيل' : 'استلام في المطعم';
  }
  return fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup at restaurant';
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
  } = input;

  const isAr = locale === 'ar';
  const lines: string[] = [];
  const showFulfillment = mode === 'takeaway' && fulfillmentType;

  if (isAr) {
    lines.push(mode === 'dining' ? '*طلب جديد — داخل المطعم*' : '*طلب جديد — تيك أواي*');
    lines.push(SEP);

    if (showFulfillment) {
      lines.push(`نوع الطلب: ${fulfillmentLabel(locale, fulfillmentType)}`);
      if (fulfillmentType === 'delivery' && deliveryAddress?.trim()) {
        lines.push(`العنوان: ${deliveryAddress.trim()}`);
      }
      lines.push(SEP);
    } else if (tableNumber) {
      lines.push(`الطاولة: ${tableNumber}`);
      lines.push(SEP);
    }

    lines.push('*الأصناف*');
    for (const item of items) {
      const lineTotal = item.unitPrice * item.quantity;
      lines.push(`${item.quantity}× ${item.name} — ${formatMoney(lineTotal, currency, locale)}`);
      if (item.notes?.trim()) {
        lines.push(`  • ${item.notes.trim()}`);
      }
    }

    lines.push(SEP);
    lines.push(`المجموع الفرعي: ${formatMoney(totals.subtotal, currency, locale)}`);
    if (totals.applyTax && totals.tax > 0) {
      lines.push(`الضريبة (${totals.taxRate}%): ${formatMoney(totals.tax, currency, locale)}`);
    }
    if (totals.applyService && totals.service > 0) {
      lines.push(
        `رسوم الخدمة (${totals.serviceRate}%): ${formatMoney(totals.service, currency, locale)}`
      );
    }
    lines.push(`*الإجمالي: ${formatMoney(totals.total, currency, locale)}*`);

    lines.push(SEP);
    lines.push(`الاسم: ${customerName}`);
    if (customerPhone?.trim()) lines.push(`الهاتف: ${customerPhone.trim()}`);
    if (orderNotes?.trim()) lines.push(`ملاحظات الطلب: ${orderNotes.trim()}`);
    if (prepTimeMinutes != null && prepTimeMinutes > 0) {
      lines.push(`وقت التحضير المتوقع: ~${prepTimeMinutes} دقيقة`);
    }
  } else {
    lines.push(mode === 'dining' ? '*New Order — Dine In*' : '*New Order — Takeaway*');
    lines.push(SEP);

    if (showFulfillment) {
      lines.push(`Order type: ${fulfillmentLabel(locale, fulfillmentType)}`);
      if (fulfillmentType === 'delivery' && deliveryAddress?.trim()) {
        lines.push(`Address: ${deliveryAddress.trim()}`);
      }
      lines.push(SEP);
    } else if (tableNumber) {
      lines.push(`Table: ${tableNumber}`);
      lines.push(SEP);
    }

    lines.push('*Items*');
    for (const item of items) {
      const lineTotal = item.unitPrice * item.quantity;
      lines.push(`${item.quantity}x ${item.name} — ${formatMoney(lineTotal, currency, locale)}`);
      if (item.notes?.trim()) {
        lines.push(`  • ${item.notes.trim()}`);
      }
    }

    lines.push(SEP);
    lines.push(`Subtotal: ${formatMoney(totals.subtotal, currency, locale)}`);
    if (totals.applyTax && totals.tax > 0) {
      lines.push(`Tax (${totals.taxRate}%): ${formatMoney(totals.tax, currency, locale)}`);
    }
    if (totals.applyService && totals.service > 0) {
      lines.push(
        `Service (${totals.serviceRate}%): ${formatMoney(totals.service, currency, locale)}`
      );
    }
    lines.push(`*Total: ${formatMoney(totals.total, currency, locale)}*`);

    lines.push(SEP);
    lines.push(`Name: ${customerName}`);
    if (customerPhone?.trim()) lines.push(`Phone: ${customerPhone.trim()}`);
    if (orderNotes?.trim()) lines.push(`Order notes: ${orderNotes.trim()}`);
    if (prepTimeMinutes != null && prepTimeMinutes > 0) {
      lines.push(`Est. prep time: ~${prepTimeMinutes} min`);
    }
  }

  return lines.join('\n');
}
