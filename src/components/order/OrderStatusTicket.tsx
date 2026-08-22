'use client';

import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { COLUMN_TONE } from '@/components/dashboard/orders/column-tone';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { cn } from '@/lib/utils';
import type { LastOrderSnapshot } from '@/lib/order/last-order';
import type { OrderStatus } from '@/types/database';

const STEPS: OrderStatus[] = ['new', 'preparing', 'ready', 'completed'];

function statusHintKey(
  status: OrderStatus
):
  | 'statusHintNew'
  | 'statusHintPreparing'
  | 'statusHintReady'
  | 'statusHintCompleted'
  | 'statusHintCancelled' {
  if (status === 'preparing') return 'statusHintPreparing';
  if (status === 'ready') return 'statusHintReady';
  if (status === 'completed') return 'statusHintCompleted';
  if (status === 'cancelled') return 'statusHintCancelled';
  return 'statusHintNew';
}

export function OrderStatusTicket({
  orderNumber,
  snapshot,
  confirmationOnly,
  isLive,
}: {
  orderNumber: string;
  snapshot: LastOrderSnapshot | null;
  confirmationOnly?: boolean;
  isLive?: boolean;
}) {
  const t = useTranslations('orderStatus');
  const tOrders = useTranslations('orders');
  const status: OrderStatus = snapshot?.status ?? 'new';
  const currentIndex = STEPS.indexOf(status === 'cancelled' ? 'new' : status);

  return (
    <section
      className="overflow-hidden rounded-2xl border border-dashed border-[var(--menu-line-strong)] bg-[var(--menu-surface)] shadow-[0_12px_28px_-22px_rgba(79,10,18,0.55)]"
      data-testid="order-status-ticket"
    >
      <div className="h-1.5 bg-[var(--menu-wine)]" aria-hidden="true" />
      <div className="space-y-5 px-5 py-6 sm:px-6">
        <div className="space-y-1 text-center">
          <p className="menu-eyebrow text-[var(--menu-ink-soft)]">{t('ticketLabel')}</p>
          <p
            className="font-heading text-3xl font-semibold tabular-nums tracking-wide text-[var(--menu-wine)]"
            data-testid="order-status-number"
          >
            {orderNumber}
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge className={cn('border px-3 py-1 text-sm', COLUMN_TONE[status])}>
              {t(`status.${status}`)}
            </Badge>
            {isLive ? (
              <span
                className="text-[11px] font-medium uppercase tracking-wide text-[var(--menu-ink-soft)]"
                data-testid="order-status-live"
              >
                {t('liveFromKitchen')}
              </span>
            ) : null}
          </div>
          <p className="max-w-[36ch] text-center text-sm leading-relaxed text-[var(--menu-ink-soft)]">
            {t(statusHintKey(status))}
          </p>
        </div>

        {status !== 'cancelled' ? (
          <ol className="grid grid-cols-4 gap-1" aria-label={t('timelineLabel')}>
            {STEPS.map((step, index) => {
              const reached = index <= currentIndex;
              return (
                <li key={step} className="flex flex-col items-center gap-1.5 text-center">
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-semibold',
                      reached
                        ? 'border-[var(--menu-wine)] bg-[var(--menu-wine)] text-[#FDF7F0]'
                        : 'border-[var(--menu-line-strong)] bg-[var(--menu-paper)] text-[var(--menu-ink-soft)]'
                    )}
                    aria-current={step === status ? 'step' : undefined}
                  >
                    {reached ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
                  </span>
                  <span
                    className={cn(
                      'text-[11px] leading-tight',
                      reached ? 'text-[var(--menu-ink)]' : 'text-[var(--menu-ink-soft)]'
                    )}
                  >
                    {t(`status.${step}`)}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : null}

        {snapshot?.diningMode ? (
          <p className="text-center text-xs text-[var(--menu-ink-soft)]">
            {snapshot.diningMode === 'dining' ? tOrders('dining') : tOrders('takeaway')}
            {snapshot.fulfillmentType === 'delivery'
              ? ` · ${tOrders('delivery')}`
              : snapshot.fulfillmentType === 'pickup'
                ? ` · ${tOrders('pickup')}`
                : ''}
          </p>
        ) : null}

        {confirmationOnly ? (
          <p className="text-center text-xs leading-relaxed text-[var(--menu-ink-soft)]">
            {t('confirmationHint')}
          </p>
        ) : null}
      </div>
    </section>
  );
}
