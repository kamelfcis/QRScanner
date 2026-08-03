'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DateRangePicker, type Period } from '@/components/dashboard/DateRangePicker';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useAnalyticsSummary, useTopProducts, useTopCategories, useDiningTakeaway } from '@/hooks/useAnalytics';
import { useExport } from '@/hooks/useExport';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { Download, Table, Printer } from 'lucide-react';
import { format } from 'date-fns';
import type { ExportData } from '@/types/database';

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('month');
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: statsRefetch } = useDashboardStats();
  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary(period);
  const { data: topProducts, isLoading: productsLoading } = useTopProducts(period);
  const { data: topCategories, isLoading: categoriesLoading } = useTopCategories(period);
  const { data: diningTakeaway } = useDiningTakeaway(period);
  const { exportCSV, exportExcel, printPage } = useExport();

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
      ['Today\'s Scans', stats?.todaysScans || 0],
      ['Today\'s Visitors', stats?.todaysVisitors || 0],
      ['Dining %', `${stats?.diningPercent || 0}%`],
      ['Takeaway %', `${stats?.takeawayPercent || 0}%`],
      ['---', '---'],
      ['Total Visitors (Period)', summary?.reduce((a, b) => a + b.visitors, 0) || 0],
      ['Total Scans (Period)', summary?.reduce((a, b) => a + b.scans, 0) || 0],
      ['Dining Orders', diningTakeaway?.dining || 0],
      ['Takeaway Orders', diningTakeaway?.takeaway || 0],
    ];

    return {
      headers,
      rows,
      filename: `warda-report-${period}-${format(new Date(), 'yyyy-MM-dd')}`,
    };
  };

  const handleExportCSV = () => exportCSV(generateReport());
  const handleExportExcel = () => exportExcel(generateReport());

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Reports</h1>
          <p className="text-muted-foreground">Generate and export restaurant reports</p>
        </div>
        <DateRangePicker value={period} onChange={setPeriod} />
      </div>

      <div id="report-content" className="space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Report Summary</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="mr-1 h-3 w-3" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <Table className="mr-1 h-3 w-3" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => printPage('report-content')}>
                <Printer className="mr-1 h-3 w-3" /> Print
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{stats?.totalProducts || 0}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Total Categories</p>
                <p className="text-2xl font-bold">{stats?.totalCategories || 0}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Today&apos;s Scans</p>
                <p className="text-2xl font-bold">{stats?.todaysScans || 0}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Active Offers</p>
                <p className="text-2xl font-bold">{stats?.totalOffers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
