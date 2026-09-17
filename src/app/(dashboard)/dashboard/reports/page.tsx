'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Download, Printer, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { SalesDateFilter } from '@/components/dashboard/reports/SalesDateFilter';
import { SalesLedger } from '@/components/dashboard/reports/SalesLedger';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { useExport } from '@/hooks/useExport';
import { useSalesReport } from '@/hooks/useSalesReport';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { getDateRange } from '@/hooks/useAnalytics';
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

  const { data, isLoading, error, refetch, bounds } = useSalesReport(period, { from, to });

  const rangeError = useMemo(() => {
    if (bounds.ok) return null;
    if (bounds.error === 'invalid_range') return t('invalidRange');
    if (bounds.error === 'range_too_wide') return t('rangeTooWide');
    return t('invalidDate');
  }, [bounds, t]);

  const kpis = data?.kpis;
  const orders = data?.orders ?? [];
  const currency = settings?.currency ?? orders[0]?.currency ?? 'EGP';

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

  if (isLoading && bounds.ok) return <LoadingPage />;
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
          <>
            <section
              aria-label={t('summary')}
              className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
            >
              <KpiCard
                label={t('grossSales')}
                value={formatCurrencyAmount(kpis?.revenue ?? 0, currency, {
                  locale: currencyLocale,
                })}
              />
              <KpiCard label={t('orderCount')} value={String(kpis?.orderCount ?? 0)} />
              <KpiCard
                label={t('cancelledCount')}
                value={String(kpis?.cancelledCount ?? 0)}
                danger
              />
              <KpiCard
                label={t('averageOrder')}
                value={formatCurrencyAmount(kpis?.averageOrderValue ?? 0, currency, {
                  locale: currencyLocale,
                })}
              />
              <KpiCard label={t('deliveryCount')} value={String(kpis?.deliveryCount ?? 0)} />
              <KpiCard
                label={t('discounts')}
                value={formatCurrencyAmount(kpis?.discounts ?? 0, currency, {
                  locale: currencyLocale,
                })}
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
        ) : null}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
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
    </div>
  );
}
