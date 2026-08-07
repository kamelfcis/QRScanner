import type { OrderTotals } from './totals';
import { formatCurrencyAmount } from './format-currency';

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
  items: WhatsAppMessageItem[];
  totals: OrderTotals;
  currency: string;
  customerName: string;
  customerPhone?: string | null;
  orderNotes?: string | null;
  prepTimeMinutes?: number | null;
}

function formatMoney(value: number, currency: string, locale: MessageLocale): string {
  return formatCurrencyAmount(value, currency, { locale, plain: true });
}

export function buildWhatsAppMessage(input: WhatsAppMessageInput): string {
  const {
    locale,
    mode,
    tableNumber,
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

  if (isAr) {
    lines.push(mode === 'dining' ? '*طلب جديد — داخل المطعم*' : '*طلب جديد — تيك أواي*');
    if (tableNumber) lines.push(`الطاولة: ${tableNumber}`);
    lines.push('---');
    for (const item of items) {
      const lineTotal = item.unitPrice * item.quantity;
      lines.push(`${item.quantity}× ${item.name} — ${formatMoney(lineTotal, currency, locale)}`);
      if (item.notes?.trim()) {
        lines.push(`  ملاحظة: ${item.notes.trim()}`);
      }
    }
    lines.push('---');
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
    lines.push('---');
    lines.push(`الاسم: ${customerName}`);
    if (customerPhone?.trim()) lines.push(`الهاتف: ${customerPhone.trim()}`);
    if (orderNotes?.trim()) lines.push(`ملاحظات الطلب: ${orderNotes.trim()}`);
    if (prepTimeMinutes != null && prepTimeMinutes > 0) {
      lines.push(`وقت التحضير المتوقع: ~${prepTimeMinutes} دقيقة`);
    }
  } else {
    lines.push(mode === 'dining' ? '*New Order — Dine In*' : '*New Order — Takeaway*');
    if (tableNumber) lines.push(`Table: ${tableNumber}`);
    lines.push('---');
    for (const item of items) {
      const lineTotal = item.unitPrice * item.quantity;
      lines.push(`${item.quantity}x ${item.name} — ${formatMoney(lineTotal, currency, locale)}`);
      if (item.notes?.trim()) {
        lines.push(`  Note: ${item.notes.trim()}`);
      }
    }
    lines.push('---');
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
    lines.push('---');
    lines.push(`Name: ${customerName}`);
    if (customerPhone?.trim()) lines.push(`Phone: ${customerPhone.trim()}`);
    if (orderNotes?.trim()) lines.push(`Order notes: ${orderNotes.trim()}`);
    if (prepTimeMinutes != null && prepTimeMinutes > 0) {
      lines.push(`Est. prep time: ~${prepTimeMinutes} min`);
    }
  }

  return lines.join('\n');
}
