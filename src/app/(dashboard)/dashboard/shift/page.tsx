'use client';

import { useMemo, useState } from 'react';
import { subDays } from 'date-fns';
import { Printer, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { ConfirmDialog } from '@/components/shared/feedback/ConfirmDialog';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { useSalesReport } from '@/hooks/useSalesReport';
import { useCloseShift, useRecentShiftCloses } from '@/hooks/useShiftClose';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { useExport } from '@/hooks/useExport';
import { getDateRange } from '@/hooks/useAnalytics';
import { dateOnlyFromDate } from '@/lib/order/sales-range';
import { formatCurrencyAmount, toCurrencyLocale } from '@/lib/order/format-currency';
import { formatLocaleDate } from '@/lib/dateLocale';
import { cn } from '@/lib/utils';

function pctChange(today: number, yesterday: number): number | null {
  if (yesterday === 0) return today === 0 ? 0 : null;
  return ((today - yesterday) / yesterday) * 100;
}

function CompareBadge({ value }: { value: number | null }) {
  const t = useTranslations('shift');
  if (value === null)
    return <span className="text-muted-foreground text-xs">{t('noCompare')}</span>;
  const positive = value >= 0;
  return (
    <span
      className={cn(
        'text-xs font-medium tabular-nums',
        positive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
      )}
    >
      {positive ? '+' : ''}
      {value.toFixed(1)}% {t('vsYesterday')}
    </span>
  );
}

export default function ShiftPage() {
  const { locale } = useI18n();
  const t = useTranslations('shift');
  const tReports = useTranslations('reports');
  const tCommon = useTranslations('common');
  const { data: settings } = useRestaurantSettings();
  const { printPage } = useExport();
  const closeShift = useCloseShift();
  const { data: recentCloses } = useRecentShiftCloses();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const todayBounds = getDateRange('today');
  const yesterday = subDays(new Date(), 1);
  const yesterdayStamp = dateOnlyFromDate(yesterday);

  const {
    data: todayData,
    isPending: todayPending,
    error: todayError,
    refetch: refetchToday,
  } = useSalesReport('today');
  const { data: yesterdayData, isPending: yesterdayPending } = useSalesReport('custom', {
    from: yesterdayStamp,
    to: yesterdayStamp,
  });

  const currencyLocale = toCurrencyLocale(locale);
  const currency = settings?.currency ?? todayData?.orders[0]?.currency ?? 'EGP';
  const kpis = todayData?.kpis;
  const yesterdayKpis = yesterdayData?.kpis;

  const compare = useMemo(
    () => ({
      revenue: pctChange(kpis?.revenue ?? 0, yesterdayKpis?.revenue ?? 0),
      orders: pctChange(kpis?.orderCount ?? 0, yesterdayKpis?.orderCount ?? 0),
      delivery: pctChange(kpis?.deliveryCount ?? 0, yesterdayKpis?.deliveryCount ?? 0),
    }),
    [kpis, yesterdayKpis]
  );

  const kpiCards = [
    {
      label: tReports('grossSales'),
      value: formatCurrencyAmount(kpis?.revenue ?? 0, currency, { locale: currencyLocale }),
      compare: compare.revenue,
    },
    {
      label: tReports('orderCount'),
      value: String(kpis?.orderCount ?? 0),
      compare: compare.orders,
    },
    {
      label: tReports('deliveryCount'),
      value: String(kpis?.deliveryCount ?? 0),
      compare: compare.delivery,
    },
    {
      label: t('diningCount'),
      value: String(kpis?.diningCount ?? 0),
      compare: null,
    },
    {
      label: t('takeawayCount'),
      value: String(kpis?.takeawayCount ?? 0),
      compare: null,
    },
    {
      label: tReports('averageOrder'),
      value: formatCurrencyAmount(kpis?.averageOrderValue ?? 0, currency, {
        locale: currencyLocale,
      }),
      compare: null,
    },
  ];

  const handleCloseShift = async () => {
    if (!kpis) return;
    try {
      await closeShift.mutateAsync({
        period_start: todayBounds.start.toISOString(),
        period_end: todayBounds.end.toISOString(),
        snapshot: { kpis, currency },
        notes: notes.trim() || null,
      });
      toast.success(t('closeSuccess'));
      setConfirmOpen(false);
      setNotes('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'));
    }
  };

  if (todayError) return <ErrorState error={todayError} retry={refetchToday} />;

  return (
    <div id="shift-summary" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-muted-foreground font-heading text-xs uppercase tracking-[0.18em]">
            {t('eyebrow')}
          </p>
          <h1 className="font-heading mt-1 text-2xl font-semibold">{t('title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('description')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => printPage('shift-summary')}
          >
            <Printer className="me-2 h-4 w-4" aria-hidden="true" />
            {t('printSummary')}
          </Button>
          <Button
            type="button"
            className="min-h-11"
            disabled={!kpis || closeShift.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            <Scale className="me-2 h-4 w-4" aria-hidden="true" />
            {t('closeShift')}
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border p-4 shadow-sm">
        <label htmlFor="shift-notes" className="text-sm font-medium">
          {t('notesLabel')}
        </label>
        <Textarea
          id="shift-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={t('notesPlaceholder')}
          className="mt-2 min-h-20"
        />
      </div>

      <div id="shift-summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {kpiCards.map((card) => (
          <div key={card.label} className="bg-card rounded-xl border p-4 shadow-sm">
            <p className="text-muted-foreground text-sm">{card.label}</p>
            {todayPending ? (
              <Skeleton className="mt-2 h-8 w-24" />
            ) : (
              <p className="font-heading mt-1 text-2xl font-semibold tabular-nums">{card.value}</p>
            )}
            {!todayPending && !yesterdayPending && card.compare !== null ? (
              <div className="mt-2">
                <CompareBadge value={card.compare} />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {recentCloses && recentCloses.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">{t('recentCloses')}</h2>
          <ul className="divide-y rounded-xl border">
            {recentCloses.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium tabular-nums">
                    {formatLocaleDate(row.closed_at, 'd MMM yyyy HH:mm', locale)}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {tReports('orderCount')}: {row.snapshot.kpis.orderCount} ·{' '}
                    {formatCurrencyAmount(
                      row.snapshot.kpis.revenue,
                      row.snapshot.currency ?? currency,
                      {
                        locale: currencyLocale,
                      }
                    )}
                  </p>
                </div>
                {row.notes ? (
                  <p className="text-muted-foreground max-w-md text-sm">{row.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('closeShift')}
        description={t('closeConfirm')}
        confirmLabel={t('closeShift')}
        cancelLabel={tCommon('cancel')}
        loadingLabel={tCommon('loading')}
        variant="default"
        loading={closeShift.isPending}
        onConfirm={() => void handleCloseShift()}
      />
    </div>
  );
}
