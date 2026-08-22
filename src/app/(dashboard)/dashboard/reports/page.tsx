'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DateRangePicker, type Period } from '@/components/dashboard/DateRangePicker';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import {
  useAnalyticsSummary,
  useTopProducts,
  useTopCategories,
  useDiningTakeaway,
} from '@/hooks/useAnalytics';
import { useSalesReport } from '@/hooks/useSalesReport';
import { useExport } from '@/hooks/useExport';
import { useFeatureSettings, useRestaurantSettings } from '@/hooks/useSettings';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { Download, FileDown, Table, Printer } from 'lucide-react';
import { format } from 'date-fns';
import type { ExportData, Order } from '@/types/database';
import { useI18n, useTranslations } from '@/components/providers/RootI18nProvider';
import { getRestaurantDisplayName } from '@/lib/appName';
import { formatLocaleDate } from '@/lib/dateLocale';
import { formatCurrencyAmount, toCurrencyLocale } from '@/lib/order/format-currency';
import { formatDisplayPhone } from '@/lib/phone/normalize';
import { useFeaturedItemsCopy } from '@/i18n/config';

function dash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : '—';
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('month');
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: statsRefetch,
  } = useDashboardStats();
  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary(period);
  const { data: topProducts, isLoading: productsLoading } = useTopProducts(period);
  const { data: topCategories, isLoading: categoriesLoading } = useTopCategories(period);
  const { data: diningTakeaway } = useDiningTakeaway(period);
  const { data: features, isLoading: featuresLoading } = useFeatureSettings();
  const { data: restaurant } = useRestaurantSettings();
  const showSales = features?.dashboard_orders === true;
  const {
    data: sales,
    isLoading: salesLoading,
    error: salesError,
    refetch: salesRefetch,
  } = useSalesReport(period, { enabled: showSales });
  const { exportCSV, exportExcel, exportPDF, printPage } = useExport();
  const { locale } = useI18n();
  const t = useTranslations('reports');
  const tDashboard = useTranslations('dashboard');
  const tOrders = useTranslations('orders');
  const tCommon = useTranslations('common');

  const isLoading = statsLoading || summaryLoading || productsLoading || categoriesLoading;

  if (isLoading) return <LoadingPage />;
  if (statsError) return <ErrorState error={statsError} retry={statsRefetch} />;

  const currencyLocale = toCurrencyLocale(locale);
  const currency = restaurant?.currency;
  const brandName = getRestaurantDisplayName(locale, restaurant);
  const generatedAt = format(new Date(), 'yyyy-MM-dd');
  const periodLabel = t(`period.${period}`);
  const salesFilename = `sales-${period}-${generatedAt}`;

  const formatMoney = (amount: number) =>
    formatCurrencyAmount(amount, currency, { locale: currencyLocale });

  const formatOrderDate = (iso: string) => formatLocaleDate(iso, 'd MMM yyyy HH:mm', locale);

  const formatStatus = (status: Order['status']) => tOrders(`status.${status}`);

  const formatPhone = (phone: string | null) => (phone ? formatDisplayPhone(phone) : '—');

  const generateReport = (): ExportData => {
    const headers = ['Metric', 'Value'];
    const rows: (string | number)[][] = [
      ['Report Period', period],
      ['Generated At', format(new Date(), 'MMM d, yyyy h:mm a')],
      ['---', '---'],
      ['Total Products', stats?.totalProducts || 0],
      ['Total Categories', stats?.totalCategories || 0],
      ['Active QR Codes', stats?.totalQRCodes || 0],
      ['Active Offers', stats?.totalOffers || 0],
      ['Gallery Images', stats?.totalGallery || 0],
      ['Testimonials', stats?.totalTestimonials || 0],
      ['---', '---'],
      [tDashboard('todaysScans'), stats?.todaysScans || 0],
      [tDashboard('todaysVisitors'), stats?.todaysVisitors || 0],
      [tDashboard('diningPercent'), `${stats?.diningPercent || 0}%`],
      [tDashboard('takeawayPercent'), `${stats?.takeawayPercent || 0}%`],
      ['---', '---'],
      ['Total Visitors (Period)', summary?.reduce((a, b) => a + b.visitors, 0) || 0],
      ['Total Scans (Period)', summary?.reduce((a, b) => a + b.scans, 0) || 0],
      ['Dining Orders', diningTakeaway?.dining || 0],
      ['Takeaway Orders', diningTakeaway?.takeaway || 0],
    ];

    return {
      headers,
      rows,
      filename: `warda-report-${period}-${generatedAt}`,
    };
  };

  const generateSalesExport = (): ExportData => {
    const orders = sales?.orders ?? [];
    const kpis = sales?.kpis;
    const headers = [
      t('colDate'),
      t('colOrderNumber'),
      t('colCustomer'),
      t('colPhone'),
      t('colStatus'),
      t('colCoupon'),
      t('colTotal'),
    ];
    const rows: (string | number)[][] = [
      [t('salesTitle'), brandName],
      [t('periodLabel'), periodLabel],
      [t('generatedAt'), format(new Date(), 'MMM d, yyyy h:mm a')],
      ['---', '---', '---', '---', '---', '---', '---'],
      [t('orderCount'), kpis?.orderCount ?? 0],
      [t('grossSales'), formatMoney(kpis?.revenue ?? 0)],
      [t('discounts'), formatMoney(kpis?.discounts ?? 0)],
      [t('averageOrder'), formatMoney(kpis?.averageOrderValue ?? 0)],
      [t('deliveryCount'), kpis?.deliveryCount ?? 0],
      ['---', '---', '---', '---', '---', '---', '---'],
      ...orders.map((order) => [
        formatOrderDate(order.created_at),
        order.order_number,
        dash(order.customer_name),
        formatPhone(order.customer_phone),
        formatStatus(order.status),
        dash(order.coupon_code),
        formatMoney(Number(order.total || 0)),
      ]),
    ];

    return { headers, rows, filename: salesFilename };
  };

  const handleExportCSV = () => exportCSV(generateReport());
  const handleExportExcel = () => exportExcel(generateReport());
  const handleSalesCsv = () => exportCSV(generateSalesExport());
  const handleSalesExcel = () => exportExcel(generateSalesExport());
  const handleSalesPdf = () => exportPDF('sales-report', salesFilename);

  const kpis = sales?.kpis;
  const kpiCards = [
    { key: 'orderCount', value: String(kpis?.orderCount ?? 0) },
    { key: 'grossSales', value: formatMoney(kpis?.revenue ?? 0) },
    { key: 'discounts', value: formatMoney(kpis?.discounts ?? 0) },
    { key: 'averageOrder', value: formatMoney(kpis?.averageOrderValue ?? 0) },
    { key: 'deliveryCount', value: String(kpis?.deliveryCount ?? 0) },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t(useFeaturedItemsCopy ? 'generateSpices' : 'generate')}
          </p>
        </div>
        <DateRangePicker value={period} onChange={setPeriod} />
      </div>

      <div id="report-content" className="space-y-6">
        {showSales && (
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>{t('salesTitle')}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 sm:min-h-8"
                  onClick={handleSalesCsv}
                  disabled={salesLoading || !sales}
                >
                  <Download className="mr-1 h-3 w-3" /> {t('csv')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 sm:min-h-8"
                  onClick={handleSalesExcel}
                  disabled={salesLoading || !sales}
                >
                  <Table className="mr-1 h-3 w-3" /> {t('excel')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-11 sm:min-h-8"
                  onClick={handleSalesPdf}
                  disabled={salesLoading || !sales}
                >
                  <FileDown className="mr-1 h-3 w-3" /> {t('downloadPdf')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {salesError ? (
                <ErrorState error={salesError} retry={salesRefetch} />
              ) : salesLoading || featuresLoading ? (
                <p className="text-muted-foreground text-sm">{tCommon('loading')}</p>
              ) : (
                <div id="sales-report" className="bg-background space-y-5 p-1">
                  <div className="space-y-1">
                    <p className="text-lg font-semibold">{brandName}</p>
                    <p className="text-muted-foreground text-sm">
                      {t('periodLabel')}: {periodLabel}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {t('generatedAt')}: {formatLocaleDate(new Date(), 'd MMM yyyy HH:mm', locale)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    {kpiCards.map((item) => (
                      <div key={item.key} className="rounded-lg border p-4">
                        <p className="text-muted-foreground text-sm">{t(item.key)}</p>
                        <p className="text-xl font-bold tabular-nums md:text-2xl">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {(sales?.orders.length ?? 0) === 0 ? (
                    <p className="text-muted-foreground py-6 text-sm">{t('emptySales')}</p>
                  ) : (
                    <div className="-mx-1 overflow-x-auto">
                      <table className="w-full min-w-[40rem] border-collapse text-sm">
                        <thead>
                          <tr className="border-b text-start">
                            <th className="px-2 py-2 font-medium">{t('colDate')}</th>
                            <th className="px-2 py-2 font-medium">{t('colOrderNumber')}</th>
                            <th className="px-2 py-2 font-medium">{t('colCustomer')}</th>
                            <th className="px-2 py-2 font-medium">{t('colPhone')}</th>
                            <th className="px-2 py-2 font-medium">{t('colStatus')}</th>
                            <th className="px-2 py-2 font-medium">{t('colCoupon')}</th>
                            <th className="px-2 py-2 text-end font-medium">{t('colTotal')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sales?.orders.map((order) => (
                            <tr key={order.id} className="border-b last:border-0">
                              <td className="whitespace-nowrap px-2 py-2">
                                {formatOrderDate(order.created_at)}
                              </td>
                              <td className="px-2 py-2 font-medium tabular-nums">
                                {order.order_number}
                              </td>
                              <td className="px-2 py-2">{dash(order.customer_name)}</td>
                              <td className="whitespace-nowrap px-2 py-2 tabular-nums">
                                {formatPhone(order.customer_phone)}
                              </td>
                              <td className="px-2 py-2">{formatStatus(order.status)}</td>
                              <td className="px-2 py-2 uppercase">{dash(order.coupon_code)}</td>
                              <td className="px-2 py-2 text-end tabular-nums">
                                {formatMoney(Number(order.total || 0))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>{t('summary')}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="min-h-11 sm:min-h-8"
                onClick={handleExportCSV}
              >
                <Download className="mr-1 h-3 w-3" /> {t('csv')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="min-h-11 sm:min-h-8"
                onClick={handleExportExcel}
              >
                <Table className="mr-1 h-3 w-3" /> {t('excel')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="min-h-11 sm:min-h-8"
                onClick={() => printPage('report-content')}
              >
                <Printer className="mr-1 h-3 w-3" /> {t('print')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">{t('totalProducts')}</p>
                <p className="text-2xl font-bold">{stats?.totalProducts || 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">{t('totalCategories')}</p>
                <p className="text-2xl font-bold">{stats?.totalCategories || 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">{t('todaysScans')}</p>
                <p className="text-2xl font-bold">{stats?.todaysScans || 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">{t('activeOffers')}</p>
                <p className="text-2xl font-bold">{stats?.totalOffers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
