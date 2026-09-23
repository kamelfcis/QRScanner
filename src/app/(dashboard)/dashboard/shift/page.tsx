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
import { useOrders } from '@/hooks/useOrders';
import { getDateRange } from '@/hooks/useAnalytics';
import { dateOnlyFromDate } from '@/lib/order/sales-range';
import { formatCurrencyAmount, toCurrencyLocale } from '@/lib/order/format-currency';
import { formatLocaleDate } from '@/lib/dateLocale';
import { pctChange } from '@/lib/analytics/compare-period';
import { CompareBadge } from '@/components/dashboard/reports/CompareBadge';
import { AccountantMonthExport } from '@/components/dashboard/AccountantMonthExport';
import { hasDailyOps, hasHettSamakaTier3 } from '@/i18n/config';
import { useExpensesForMonth, useExpensesForRange, sumExpenses } from '@/hooks/useExpenses';
import {
  buildOrderItemsMap,
  computeDailyOpsBreakdown,
  type DailyOpsBreakdown,
} from '@/lib/order/shift-daily-breakdown';

function isSameLocalDay(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
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
  const { data: allOrders } = useOrders();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const todayBounds = getDateRange('today');
  const todayStamp = dateOnlyFromDate(new Date());
  const yesterday = subDays(new Date(), 1);
  const yesterdayStamp = dateOnlyFromDate(yesterday);
  const now = new Date();
  const expenseYear = now.getFullYear();
  const expenseMonth = now.getMonth() + 1;

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
  const { data: todayExpenses } = useExpensesForRange(todayStamp, todayStamp, hasDailyOps);
  const { data: monthExpenses } = useExpensesForMonth(expenseYear, expenseMonth);
  const monthFrom = dateOnlyFromDate(new Date(expenseYear, expenseMonth - 1, 1));
  const monthTo = dateOnlyFromDate(new Date(expenseYear, expenseMonth, 0));
  const { data: monthSales } = useSalesReport('custom', {
    from: monthFrom,
    to: monthTo,
    enabled: hasHettSamakaTier3,
  });

  const currencyLocale = toCurrencyLocale(locale);
  const currency = settings?.currency ?? todayData?.orders[0]?.currency ?? 'EGP';
  const kpis = todayData?.kpis;
  const yesterdayKpis = yesterdayData?.kpis;

  const todayOrdersWithItems = useMemo(
    () => (allOrders ?? []).filter((order) => isSameLocalDay(order.created_at)),
    [allOrders]
  );

  const todayExpenseTotal = sumExpenses(todayExpenses);

  const dailyBreakdown: DailyOpsBreakdown | null = useMemo(() => {
    if (!hasDailyOps) return null;
    return computeDailyOpsBreakdown(
      todayOrdersWithItems,
      buildOrderItemsMap(todayOrdersWithItems),
      todayExpenseTotal
    );
  }, [todayOrdersWithItems, todayExpenseTotal]);

  const compare = useMemo(
    () => ({
      revenue: pctChange(kpis?.revenue ?? 0, yesterdayKpis?.revenue ?? 0),
      orders: pctChange(kpis?.orderCount ?? 0, yesterdayKpis?.orderCount ?? 0),
      delivery: pctChange(kpis?.deliveryCount ?? 0, yesterdayKpis?.deliveryCount ?? 0),
    }),
    [kpis, yesterdayKpis]
  );

  const todayNet = dailyBreakdown?.netRevenue ?? (kpis?.revenue ?? 0) - todayExpenseTotal;

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
    ...(hasDailyOps
      ? [
          {
            label: t('expensesToday'),
            value: formatCurrencyAmount(todayExpenseTotal, currency, { locale: currencyLocale }),
            compare: null,
          },
          {
            label: t('netToday'),
            value: formatCurrencyAmount(todayNet, currency, { locale: currencyLocale }),
            compare: null,
          },
          ...(hasHettSamakaTier3
            ? [
                {
                  label: t('netMonth'),
                  value: formatCurrencyAmount(
                    (monthSales?.kpis.revenue ?? 0) - sumExpenses(monthExpenses),
                    currency,
                    { locale: currencyLocale }
                  ),
                  compare: null,
                },
              ]
            : []),
        ]
      : []),
  ];

  const breakdownCards = dailyBreakdown
    ? [
        { label: t('onlineOrders'), value: String(dailyBreakdown.onlineOrderCount) },
        { label: t('cashierOrders'), value: String(dailyBreakdown.cashierOrderCount) },
        {
          label: t('cashTotal'),
          value: formatCurrencyAmount(dailyBreakdown.cashTotal, currency, {
            locale: currencyLocale,
          }),
        },
        {
          label: t('cardTotal'),
          value: formatCurrencyAmount(dailyBreakdown.cardTotal, currency, {
            locale: currencyLocale,
          }),
        },
        {
          label: t('instapayTotal'),
          value: formatCurrencyAmount(dailyBreakdown.instapayTotal, currency, {
            locale: currencyLocale,
          }),
        },
        {
          label: t('voidsTotal'),
          value: formatCurrencyAmount(dailyBreakdown.voidTotal, currency, {
            locale: currencyLocale,
          }),
        },
        {
          label: t('voidsCount'),
          value: String(dailyBreakdown.voidCount),
        },
      ]
    : [];

  const handleCloseShift = async () => {
    if (!kpis) return;
    try {
      await closeShift.mutateAsync({
        period_start: todayBounds.start.toISOString(),
        period_end: todayBounds.end.toISOString(),
        snapshot: {
          kpis,
          currency,
          ...(dailyBreakdown ? { dailyOps: dailyBreakdown } : {}),
        },
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-muted-foreground font-heading text-xs uppercase tracking-[0.18em]">
            {t('eyebrow')}
          </p>
          <h1 className="font-heading mt-1 text-2xl font-semibold">{t('title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('description')}</p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <AccountantMonthExport />
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

      <div id="shift-summary" className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {kpiCards.map((card) => (
            <div key={card.label} className="bg-card rounded-xl border p-4 shadow-sm">
              <p className="text-muted-foreground text-sm">{card.label}</p>
              {todayPending ? (
                <Skeleton className="mt-2 h-8 w-24" />
              ) : (
                <p className="font-heading mt-1 text-2xl font-semibold tabular-nums">
                  {card.value}
                </p>
              )}
              {!todayPending && !yesterdayPending && card.compare !== null ? (
                <div className="mt-2">
                  <CompareBadge
                    value={card.compare}
                    vsLabel={t('vsYesterday')}
                    noCompareLabel={t('noCompare')}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {hasDailyOps && breakdownCards.length > 0 ? (
          <section className="space-y-3">
            <h2 className="font-heading text-lg font-semibold">{t('dailySheetTitle')}</h2>
            <p className="text-muted-foreground text-sm">{t('dailySheetDescription')}</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {breakdownCards.map((card) => (
                <div key={card.label} className="bg-card rounded-xl border p-4 shadow-sm">
                  <p className="text-muted-foreground text-sm">{card.label}</p>
                  <p className="font-heading mt-1 text-xl font-semibold tabular-nums">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>
            {dailyBreakdown ? (
              <div className="bg-card rounded-xl border p-4 shadow-sm print:break-inside-avoid">
                <p className="text-muted-foreground text-sm">{t('netAfterVoids')}</p>
                <p className="font-heading mt-1 text-2xl font-semibold tabular-nums">
                  {formatCurrencyAmount(dailyBreakdown.netRevenue, currency, {
                    locale: currencyLocale,
                  })}
                </p>
              </div>
            ) : null}
          </section>
        ) : null}
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
