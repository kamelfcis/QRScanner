'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Download, Printer, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { CompareBadge } from '@/components/dashboard/reports/CompareBadge';
import { SalesDateFilter } from '@/components/dashboard/reports/SalesDateFilter';
import { SalesLedger } from '@/components/dashboard/reports/SalesLedger';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { useExport } from '@/hooks/useExport';
import { useSalesReport } from '@/hooks/useSalesReport';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { getDateRange } from '@/hooks/useAnalytics';
import {
  getPriorPeriodCustomRange,
  isComparableReportPeriod,
  pctChange,
} from '@/lib/analytics/compare-period';
import { dateOnlyFromDate, type SalesReportPeriod } from '@/lib/order/sales-range';
import { formatCurrencyAmount, toCurrencyLocale } from '@/lib/order/format-currency';
import { cn } from '@/lib/utils';
import type { ExportData } from '@/types/database';

const todayStamp = () => dateOnlyFromDate(new Date());

export default function ReportsPage() {
  const [period, setPeriod] = useState<SalesReportPeriod>('today');
  const [from, setFrom] = useState(todayStamp);
  const [to, setTo] = useState(todayStamp);
  const { locale } = useI18n();
  const t = useTranslations('reports');
  const tOrders = useTranslations('orders');
  const tMenu = useTranslations('menu');
  const tCommon = useTranslations('common');
  const { data: settings } = useRestaurantSettings();
  const { exportCSV, exportExcel, printPage } = useExport();
  const currencyLocale = toCurrencyLocale(locale);

  const comparable = isComparableReportPeriod(period);
  const priorRange = comparable ? getPriorPeriodCustomRange(period) : null;

  const { data, isPending, isFetching, error, refetch, bounds } = useSalesReport(period, {
    from,
    to,
  });
  const {
    data: priorData,
    isPending: priorPending,
    isFetching: priorFetching,
  } = useSalesReport('custom', {
    from: priorRange?.from ?? '',
    to: priorRange?.to ?? '',
    enabled: comparable && Boolean(priorRange),
  });
  const showInlineLoading = bounds.ok && !data && (isPending || isFetching);
  const priorLoading = comparable && (priorPending || priorFetching);

  const rangeError = useMemo(() => {
    if (bounds.ok) return null;
    if (bounds.error === 'invalid_range') return t('invalidRange');
    if (bounds.error === 'range_too_wide') return t('rangeTooWide');
    return t('invalidDate');
  }, [bounds, t]);

  const kpis = data?.kpis;
  const priorKpis = priorData?.kpis;
  const orders = data?.orders ?? [];
  const currency = settings?.currency ?? orders[0]?.currency ?? 'EGP';

  const compare = useMemo(() => {
    if (!comparable) return null;
    return {
      revenue: pctChange(kpis?.revenue ?? 0, priorKpis?.revenue ?? 0),
      orders: pctChange(kpis?.orderCount ?? 0, priorKpis?.orderCount ?? 0),
      cancelled: pctChange(kpis?.cancelledCount ?? 0, priorKpis?.cancelledCount ?? 0),
      average: pctChange(kpis?.averageOrderValue ?? 0, priorKpis?.averageOrderValue ?? 0),
      delivery: pctChange(kpis?.deliveryCount ?? 0, priorKpis?.deliveryCount ?? 0),
      discounts: pctChange(kpis?.discounts ?? 0, priorKpis?.discounts ?? 0),
    };
  }, [comparable, kpis, priorKpis]);

  const applyPreset = (next: Exclude<SalesReportPeriod, 'custom'>) => {
    const range = getDateRange(next);
    setPeriod(next);
    setFrom(dateOnlyFromDate(range.start));
    setTo(dateOnlyFromDate(range.end));
  };

  const handleFromChange = (value: string) => {
    setFrom(value);
    setPeriod('custom');
  };

  const handleToChange = (value: string) => {
    setTo(value);
    setPeriod('custom');
  };

  const generateReport = (): ExportData => ({
    headers: [t('colOrderNumber'), t('colDate'), t('colCustomer'), t('colStatus'), t('colTotal')],
    rows: [
      [t('grossSales'), kpis?.revenue ?? 0],
      [t('orderCount'), kpis?.orderCount ?? 0],
      [t('cancelledCount'), kpis?.cancelledCount ?? 0],
      [t('averageOrder'), kpis?.averageOrderValue ?? 0],
      [t('deliveryCount'), kpis?.deliveryCount ?? 0],
      [t('discounts'), kpis?.discounts ?? 0],
      ['---', '---'],
      ...orders.map((order) => [
        order.order_number,
        format(new Date(order.created_at), 'yyyy-MM-dd HH:mm'),
        order.customer_name,
        order.status,
        Number(order.total),
      ]),
    ],
    filename: `sales-${from}-${to}`,
  });

  if (error) return <ErrorState error={error} retry={refetch} />;

  const subtitle = period === 'today' ? t('salesToday') : t('rangeLabel', { from, to });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-muted-foreground font-heading text-xs uppercase tracking-[0.18em]">
            {t('salesTitle')}
          </p>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="min-h-11"
            onClick={() => exportCSV(generateReport())}
          >
            <Download className="me-1 h-3.5 w-3.5" aria-hidden="true" /> {t('csv')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11"
            onClick={() => exportExcel(generateReport())}
          >
            <Table className="me-1 h-3.5 w-3.5" aria-hidden="true" /> {t('excel')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11"
            onClick={() => printPage('report-content')}
          >
            <Printer className="me-1 h-3.5 w-3.5" aria-hidden="true" /> {t('print')}
          </Button>
        </div>
      </div>

      <SalesDateFilter
        period={period}
        from={from}
        to={to}
        onPeriodChange={applyPreset}
        onFromChange={handleFromChange}
        onToChange={handleToChange}
        error={rangeError}
        t={t}
      />

      <div id="report-content" className="space-y-6">
        {bounds.ok ? (
          showInlineLoading ? (
            <ReportsContentSkeleton summaryLabel={t('summary')} />
          ) : (
            <>
              {comparable ? (
                <p className="text-muted-foreground text-sm">{t('comparePrevious')}</p>
              ) : null}
              <section
                aria-label={t('summary')}
                className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
              >
                <KpiCard
                  label={t('grossSales')}
                  value={formatCurrencyAmount(kpis?.revenue ?? 0, currency, {
                    locale: currencyLocale,
                  })}
                  compare={compare?.revenue ?? null}
                  showCompare={comparable && !priorLoading}
                  vsLabel={t('vsPrevious')}
                  noCompareLabel={t('noCompare')}
                />
                <KpiCard
                  label={t('orderCount')}
                  value={String(kpis?.orderCount ?? 0)}
                  compare={compare?.orders ?? null}
                  showCompare={comparable && !priorLoading}
                  vsLabel={t('vsPrevious')}
                  noCompareLabel={t('noCompare')}
                />
                <KpiCard
                  label={t('cancelledCount')}
                  value={String(kpis?.cancelledCount ?? 0)}
                  danger
                  compare={compare?.cancelled ?? null}
                  showCompare={comparable && !priorLoading}
                  vsLabel={t('vsPrevious')}
                  noCompareLabel={t('noCompare')}
                />
                <KpiCard
                  label={t('averageOrder')}
                  value={formatCurrencyAmount(kpis?.averageOrderValue ?? 0, currency, {
                    locale: currencyLocale,
                  })}
                  compare={compare?.average ?? null}
                  showCompare={comparable && !priorLoading}
                  vsLabel={t('vsPrevious')}
                  noCompareLabel={t('noCompare')}
                />
                <KpiCard
                  label={t('deliveryCount')}
                  value={String(kpis?.deliveryCount ?? 0)}
                  compare={compare?.delivery ?? null}
                  showCompare={comparable && !priorLoading}
                  vsLabel={t('vsPrevious')}
                  noCompareLabel={t('noCompare')}
                />
                <KpiCard
                  label={t('discounts')}
                  value={formatCurrencyAmount(kpis?.discounts ?? 0, currency, {
                    locale: currencyLocale,
                  })}
                  compare={compare?.discounts ?? null}
                  showCompare={comparable && !priorLoading}
                  vsLabel={t('vsPrevious')}
                  noCompareLabel={t('noCompare')}
                />
              </section>

              <SalesLedger
                orders={orders}
                locale={locale}
                currencyLocale={currencyLocale}
                settings={settings}
                t={t}
                tOrders={tOrders}
                tMenu={tMenu}
                tCommon={tCommon}
              />
            </>
          )
        ) : null}
      </div>
    </div>
  );
}

function ReportsContentSkeleton({ summaryLabel }: { summaryLabel: string }) {
  return (
    <>
      <section
        aria-busy="true"
        aria-label={summaryLabel}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
      >
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="border-border bg-card rounded-xl border px-3 py-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-7 w-20" />
          </div>
        ))}
      </section>
      <div className="border-border bg-card space-y-3 rounded-xl border p-4">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </>
  );
}

function KpiCard({
  label,
  value,
  danger = false,
  compare = null,
  showCompare = false,
  vsLabel,
  noCompareLabel,
}: {
  label: string;
  value: string;
  danger?: boolean;
  compare?: number | null;
  showCompare?: boolean;
  vsLabel?: string;
  noCompareLabel?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-3',
        danger ? 'border-destructive/40 bg-destructive/10' : 'border-border bg-card'
      )}
    >
      <p className={cn('text-xs', danger ? 'text-destructive' : 'text-muted-foreground')}>
        {label}
      </p>
      <p
        className={cn(
          'font-heading mt-1 text-xl font-semibold tabular-nums sm:text-2xl',
          danger && 'text-destructive'
        )}
      >
        {value}
      </p>
      {showCompare && vsLabel && noCompareLabel ? (
        <div className="mt-1.5">
          <CompareBadge value={compare} vsLabel={vsLabel} noCompareLabel={noCompareLabel} />
        </div>
      ) : null}
    </div>
  );
}
