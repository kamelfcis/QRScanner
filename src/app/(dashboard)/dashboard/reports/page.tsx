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
import { useExport } from '@/hooks/useExport';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { Download, Table, Printer } from 'lucide-react';
import { format } from 'date-fns';
import type { ExportData } from '@/types/database';
import { useTranslations } from '@/components/providers/RootI18nProvider';
import { useI18n } from '@/components/providers/RootI18nProvider';
import { useRestaurantSettings } from '@/hooks/useSettings';
import { getAppNameFallback } from '@/lib/appName';
import { slugify } from '@/lib/qr/logo-overlay';

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
  const { exportCSV, exportExcel, printPage } = useExport();
  const t = useTranslations('reports');
  const tDashboard = useTranslations('dashboard');
  const { locale } = useI18n();
  const { data: settings } = useRestaurantSettings();
  const reportPrefix = slugify(settings?.name_en || getAppNameFallback());
  const nameAr = (settings?.name_ar || '').trim();
  const nameEn = (settings?.name_en || '').trim();
  const displayName = locale === 'ar' ? nameAr || 'عطارة اهل الشام' : nameEn || 'Ahl Elsham';

  const isLoading = statsLoading || summaryLoading || productsLoading || categoriesLoading;

  if (isLoading) return <LoadingPage />;
  if (statsError) return <ErrorState error={statsError} retry={statsRefetch} />;

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
      filename: `${reportPrefix}-report-${period}-${format(new Date(), 'yyyy-MM-dd')}`,
    };
  };

  const handleExportCSV = () => exportCSV(generateReport());
  const handleExportExcel = () => exportExcel(generateReport());

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t('title')}</h1>
          <p className="text-muted-foreground">{t('generate', { name: displayName })}</p>
        </div>
        <DateRangePicker value={period} onChange={setPeriod} />
      </div>

      <div id="report-content" className="space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>{t('summary')}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="mr-1 h-3 w-3" /> {t('csv')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <Table className="mr-1 h-3 w-3" /> {t('excel')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => printPage('report-content')}>
                <Printer className="mr-1 h-3 w-3" /> {t('print')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
