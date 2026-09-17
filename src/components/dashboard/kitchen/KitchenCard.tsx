'use client';

import { formatDistanceToNow } from 'date-fns';
import { ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KitchenPrintButton } from '@/components/dashboard/orders/KitchenPrintButton';
import { COLUMN_TONE } from '@/components/dashboard/orders/column-tone';
import { formatKitchenItemLine } from '@/lib/order/kitchen-ticket-format';
import { getDateFnsLocale } from '@/lib/dateLocale';
import { cn } from '@/lib/utils';
import type { OrderStatus, OrderWithItems } from '@/types/database';

function isUnacknowledged(order: OrderWithItems): boolean {
  return order.status === 'new' && !order.staff_acknowledged_at;
}

type KitchenCopy = (key: string, values?: Record<string, string | number>) => string;

export function KitchenCard({
  order,
  locale,
  t,
  busy,
  onAcknowledge,
  onStatus,
}: {
  order: OrderWithItems;
  locale: string;
  t: KitchenCopy;
  busy: boolean;
  onAcknowledge: (id: string) => void;
  onStatus: (order: OrderWithItems, status: OrderStatus) => void;
}) {
  const needsAck = isUnacknowledged(order);
  const nextStatus: OrderStatus | null =
    order.status === 'new'
      ? 'preparing'
      : order.status === 'preparing'
        ? 'ready'
        : null;

  const relativeTime = formatDistanceToNow(new Date(order.created_at), {
    addSuffix: true,
    locale: getDateFnsLocale(locale),
  });

  return (
    <article
      className={cn(
        'bg-background flex flex-col gap-4 rounded-2xl border p-4 shadow-sm',
        needsAck && 'border-amber-500 ring-2 ring-amber-500/30'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
            {order.order_number}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">{relativeTime}</p>
        </div>
        <Badge className={cn('border text-xs', COLUMN_TONE[order.status])}>
          {t(`status.${order.status}`)}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="bg-muted inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1">
          {order.dining_mode === 'dining' ? (
            <UtensilsCrossed className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          )}
          {order.dining_mode === 'dining' ? t('dining') : t('takeaway')}
        </span>
        {order.fulfillment_type ? (
          <span className="bg-muted inline-flex min-h-9 items-center rounded-full px-3 py-1">
            {order.fulfillment_type === 'delivery' ? t('delivery') : t('pickup')}
          </span>
        ) : null}
        {order.table_number ? (
          <span className="bg-muted inline-flex min-h-9 items-center rounded-full px-3 py-1">
            {t('table')} {order.table_number}
          </span>
        ) : null}
      </div>

      <ul className="space-y-3 text-base sm:text-lg">
        {order.items.map((item) => {
          const line = formatKitchenItemLine(item, locale, t);
          return (
            <li key={item.id}>
              <p className="font-medium leading-snug">
                <span className="tabular-nums">{line.quantity}×</span> {line.name}
                {line.sizeLabel ? (
                  <span className="text-muted-foreground ms-1 text-sm">({line.sizeLabel})</span>
                ) : null}
                {line.weightGrams != null ? (
                  <span className="text-muted-foreground ms-1 text-sm">({line.weightGrams}g)</span>
                ) : null}
              </p>
              {line.notes ? (
                <p className="text-muted-foreground mt-0.5 text-sm">{line.notes}</p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {order.notes ? (
        <p className="rounded-lg border border-dashed px-3 py-2 text-sm">{order.notes}</p>
      ) : null}

      <div className="mt-auto grid gap-2">
        {needsAck ? (
          <Button
            className="min-h-11 bg-amber-600 text-white hover:bg-amber-700"
            disabled={busy}
            onClick={() => onAcknowledge(order.id)}
          >
            {t('acknowledge')}
          </Button>
        ) : null}
        {nextStatus ? (
          <Button
            className="min-h-11 text-base"
            disabled={busy}
            onClick={() => onStatus(order, nextStatus)}
          >
            {t(`action.${nextStatus}`)}
          </Button>
        ) : null}
        <KitchenPrintButton order={order} locale={locale} t={t} disabled={busy} className="w-full" />
      </div>
    </article>
  );
}
