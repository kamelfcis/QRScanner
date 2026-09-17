'use client';

import { formatLocaleDate } from '@/lib/dateLocale';
import {
  formatKitchenFulfillment,
  formatKitchenItemLine,
} from '@/lib/order/kitchen-ticket-format';
import { kitchenDomId, RECEIPT_SLIP_CSS } from '@/lib/order/print-receipt';
import type { OrderWithItems } from '@/types/database';

interface KitchenTicketProps {
  order: OrderWithItems;
  locale: string;
  t: (key: string, values?: Record<string, string | number>) => string;
}

export function KitchenTicket({ order, locale, t }: KitchenTicketProps) {
  const fulfillment = formatKitchenFulfillment(order, t);

  return (
    <div
      id={kitchenDomId(order.id)}
      className="order-receipt-slip"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <style>{RECEIPT_SLIP_CSS}</style>
      <p className="receipt-shop">{t('printKitchen')}</p>
      <p className="receipt-order">{order.order_number}</p>
      <p className="receipt-meta">
        {formatLocaleDate(order.created_at, 'dd/MM/yyyy HH:mm', locale)}
      </p>
      <p className="receipt-meta">
        {fulfillment}
        {order.table_number ? ` · ${t('table')} ${order.table_number}` : ''}
      </p>

      <hr className="receipt-rule" />

      {order.items.map((item) => {
        const line = formatKitchenItemLine(item, locale, t);
        const option = line.sizeLabel ?? (line.weightGrams != null ? `${line.weightGrams}g` : null);
        return (
          <div key={item.id} style={{ marginBottom: 8 }}>
            <p className="receipt-item-name" style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>
              <span className="receipt-num">{line.quantity}×</span> {line.name}
              {option ? ` (${option})` : ''}
            </p>
            {line.notes ? <span className="receipt-note">{line.notes}</span> : null}
          </div>
        );
      })}

      {order.notes ? (
        <>
          <hr className="receipt-rule" />
          <p className="receipt-note" style={{ fontSize: 12 }}>
            {order.notes}
          </p>
        </>
      ) : null}

      <p className="receipt-dots">· · ·</p>
    </div>
  );
}
