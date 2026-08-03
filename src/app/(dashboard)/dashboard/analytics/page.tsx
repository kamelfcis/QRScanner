'use client';

import { useState } from 'react';
import { useRealtimeAnalytics } from '@/hooks/useRealtime';
import { DateRangePicker, type Period } from '@/components/dashboard/DateRangePicker';
import { VisitorsChart } from '@/components/dashboard/analytics/VisitorsChart';
import { DiningTakeawayChart } from '@/components/dashboard/analytics/DiningTakeawayChart';
import { PeakHoursChart } from '@/components/dashboard/analytics/PeakHoursChart';
import { TopProductsChart } from '@/components/dashboard/analytics/TopProductsChart';
import { TopCategoriesChart } from '@/components/dashboard/analytics/TopCategoriesChart';
import { SearchTermsChart } from '@/components/dashboard/analytics/SearchTermsChart';
import { DeviceBreakdown } from '@/components/dashboard/analytics/DeviceBreakdown';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { BarChart3, Package, Layers, Search, Monitor } from 'lucide-react';

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('week');
  useRealtimeAnalytics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Track visitor behavior and performance metrics.</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
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
          <DateRangePicker value={period} onChange={setPeriod} />
          <div className="grid gap-6 md:grid-cols-2">
            <VisitorsChart period={period} />
            <DiningTakeawayChart period={period} />
          </div>
          <PeakHoursChart period={period} />
        </TabsContent>

        <TabsContent value="products">
          <TopProductsChart period={period} />
        </TabsContent>

        <TabsContent value="categories">
          <TopCategoriesChart period={period} />
        </TabsContent>

        <TabsContent value="search">
          <SearchTermsChart period={period} />
        </TabsContent>

        <TabsContent value="devices">
          <DeviceBreakdown period={period} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
