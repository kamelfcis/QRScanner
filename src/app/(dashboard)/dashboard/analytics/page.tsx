'use client';

import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRealtimeAnalytics } from '@/hooks/useRealtime';
import { DateRangePicker, type Period } from '@/components/dashboard/DateRangePicker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { BarChart3, Package, Layers, Search, Monitor } from 'lucide-react';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';

const VisitorsChart = dynamic(() => import('@/components/dashboard/analytics/VisitorsChart').then(m => ({ default: m.VisitorsChart })), { ssr: false });
const QRScansChart = dynamic(() => import('@/components/dashboard/analytics/QRScansChart').then(m => ({ default: m.QRScansChart })), { ssr: false });
const DiningTakeawayChart = dynamic(() => import('@/components/dashboard/analytics/DiningTakeawayChart').then(m => ({ default: m.DiningTakeawayChart })), { ssr: false });
const PeakHoursChart = dynamic(() => import('@/components/dashboard/analytics/PeakHoursChart').then(m => ({ default: m.PeakHoursChart })), { ssr: false });
const TopProductsChart = dynamic(() => import('@/components/dashboard/analytics/TopProductsChart').then(m => ({ default: m.TopProductsChart })), { ssr: false });
const TopCategoriesChart = dynamic(() => import('@/components/dashboard/analytics/TopCategoriesChart').then(m => ({ default: m.TopCategoriesChart })), { ssr: false });
const SearchTermsChart = dynamic(() => import('@/components/dashboard/analytics/SearchTermsChart').then(m => ({ default: m.SearchTermsChart })), { ssr: false });
const DeviceBreakdown = dynamic(() => import('@/components/dashboard/analytics/DeviceBreakdown').then(m => ({ default: m.DeviceBreakdown })), { ssr: false });

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('week');
  useRealtimeAnalytics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Analytics</h1>
        <p className="text-muted-foreground">Track visitor behavior and performance metrics.</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="overview" className="gap-1">
            <BarChart3 className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-1">
            <Package className="h-4 w-4" /> Products
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-1">
            <Layers className="h-4 w-4" /> Categories
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-1">
            <Search className="h-4 w-4" /> Search
          </TabsTrigger>
          <TabsTrigger value="devices" className="gap-1">
            <Monitor className="h-4 w-4" /> Devices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Suspense fallback={<LoadingPage />}>
            <DateRangePicker value={period} onChange={setPeriod} />
            <div className="grid gap-6 md:grid-cols-2">
              <VisitorsChart period={period} />
              <DiningTakeawayChart period={period} />
            </div>
            <PeakHoursChart period={period} />
          </Suspense>
        </TabsContent>

        <TabsContent value="products">
          <Suspense fallback={<LoadingPage />}>
            <TopProductsChart period={period} />
          </Suspense>
        </TabsContent>

        <TabsContent value="categories">
          <Suspense fallback={<LoadingPage />}>
            <TopCategoriesChart period={period} />
          </Suspense>
        </TabsContent>

        <TabsContent value="search">
          <Suspense fallback={<LoadingPage />}>
            <SearchTermsChart period={period} />
          </Suspense>
        </TabsContent>

        <TabsContent value="devices">
          <Suspense fallback={<LoadingPage />}>
            <DeviceBreakdown period={period} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
