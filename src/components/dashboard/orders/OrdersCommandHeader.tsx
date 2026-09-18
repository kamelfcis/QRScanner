'use client';

import { Ban, ClipboardList, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types/database';
import {
  ACTIVE_COLUMNS,
  COLUMN_TONE,
  COLUMN_TONE_POS,
  type ActiveOrderStatus,
} from './column-tone';

export function ordersColumnId(status: OrderStatus): string {
  return `orders-col-${status}`;
}

type OrdersTab = 'active' | 'cancelled';

interface OrdersCommandHeaderProps {
  tab: OrdersTab;
  onTabChange: (tab: OrdersTab) => void;
  statusCounts: Record<ActiveOrderStatus, number>;
  unackedCount: number;
  todayCount: number;
  cancelledCount: number;
  formattedRevenue: string;
  prefersReducedMotion: boolean;
  onStatusFocus: (status: OrderStatus) => void;
  onNewStaffOrder: () => void;
  onCleanup?: () => void;
  compact?: boolean;
}

export function OrdersCommandHeader({
  tab,
  onTabChange,
  statusCounts,
  unackedCount,
  todayCount,
  cancelledCount,
  formattedRevenue,
  prefersReducedMotion,
  onStatusFocus,
  onNewStaffOrder,
  onCleanup,
  compact = false,
}: OrdersCommandHeaderProps) {
  const t = useTranslations('orders');
  const tone = compact ? COLUMN_TONE_POS : COLUMN_TONE;

  return (
    <header className="border-border bg-card relative overflow-hidden rounded-2xl border shadow-sm">
      <div aria-hidden="true" className="bg-secondary absolute inset-y-0 start-0 w-1.5" />
      {!compact ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, transparent, transparent 27px, currentColor 27px, currentColor 28px)',
          }}
        />
      ) : null}

      <div
        className={cn(
          'relative space-y-3 px-4 ps-6 sm:px-5 sm:ps-7',
          compact ? 'py-3' : 'space-y-4 py-4'
        )}
      >
        <div
          className={cn(
            'flex gap-3',
            compact
              ? 'flex-row flex-wrap items-center justify-between'
              : 'flex-col sm:flex-row sm:items-start sm:justify-between'
          )}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-emerald-600/35 bg-emerald-50 px-3 text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-950/50 dark:text-emerald-200">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  {!prefersReducedMotion ? (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
                  ) : null}
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                </span>
                {t('liveNow')}
              </span>
              {compact ? (
                <p className="text-foreground/80 min-w-0 text-sm">
                  <span className="tabular-nums">{t('todayOrders', { count: todayCount })}</span>
                  <span className="text-muted-foreground mx-1.5" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-heading tabular-nums">
                    {t('todayRevenue', { amount: formattedRevenue })}
                  </span>
                </p>
              ) : (
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.16em]">
                  {t('liveEyebrow')}
                </p>
              )}
            </div>
            {!compact ? (
              <>
                <h1 className="font-heading mt-2 flex items-center gap-2 text-2xl font-semibold">
                  <ClipboardList className="text-secondary h-6 w-6 shrink-0" aria-hidden="true" />
                  {t('title')}
                </h1>
                <p className="text-muted-foreground mt-1 max-w-prose text-sm max-sm:hidden">
                  {t('description')}
                </p>
              </>
            ) : (
              <h1 className="sr-only">{t('title')}</h1>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 self-start">
            {!compact ? (
              <Button type="button" className="min-h-11 gap-2" onClick={onNewStaffOrder}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t('newStaffOrder')}
              </Button>
            ) : null}
            {onCleanup ? (
              <button
                type="button"
                onClick={onCleanup}
                aria-label={t('cleanupOrders')}
                className={cn(
                  'text-muted-foreground hover:text-foreground hover:bg-muted',
                  'inline-flex min-h-12 min-w-12 items-center justify-center rounded-full',
                  'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
                )}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
            <div
              className="bg-muted/80 inline-flex rounded-full p-1"
              role="tablist"
              aria-label={t('title')}
            >
              {(
                [
                  {
                    id: 'active' as const,
                    label: t('tabActive'),
                    count: todayCount,
                    icon: ClipboardList,
                  },
                  {
                    id: 'cancelled' as const,
                    label: t('tabCancelled'),
                    count: cancelledCount,
                    icon: Ban,
                  },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === item.id}
                    aria-label={`${item.label} ${item.count}`}
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      'inline-flex min-h-12 min-w-12 items-center justify-center gap-1.5 rounded-full text-sm font-medium transition-colors',
                      compact ? 'px-3' : 'px-4',
                      tab === item.id
                        ? 'bg-secondary text-secondary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {compact ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                    <span className={cn(compact && 'max-sm:sr-only')}>{item.label}</span>
                    <span
                      className={cn(
                        'text-xs font-semibold tabular-nums',
                        tab === item.id ? 'text-secondary-foreground/85' : 'text-muted-foreground'
                      )}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className={cn(compact ? 'pt-1' : 'border-primary/25 border-t pt-4')}>
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            role="group"
            aria-label={t('statusMeter')}
          >
            {ACTIVE_COLUMNS.map((status) => {
              const count = statusCounts[status];
              const showAck = status === 'new' && unackedCount > 0;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => onStatusFocus(status)}
                  className={cn(
                    'flex min-h-16 flex-col items-start justify-center rounded-xl border px-3 py-2 text-start transition-colors',
                    'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                    tone[status]
                  )}
                >
                  <span className="text-[0.7rem] font-semibold uppercase tracking-wide opacity-80">
                    {t(`status.${status}`)}
                  </span>
                  <span className="font-heading text-2xl font-semibold tabular-nums leading-none">
                    {count}
                  </span>
                  {showAck ? (
                    <span className="mt-1 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[0.65rem] font-semibold text-amber-900 dark:text-amber-100">
                      {t('awaitingAck')}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {!compact ? (
            <p className="text-foreground/80 mt-3 text-sm">
              <span className="text-secondary font-semibold">{t('tabActive')}</span>
              {': '}
              <span className="tabular-nums">{t('todayOrders', { count: todayCount })}</span>
              <span className="text-muted-foreground mx-1.5" aria-hidden="true">
                ·
              </span>
              <span className="font-heading tabular-nums">
                {t('todayRevenue', { amount: formattedRevenue })}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </header>
  );
}
