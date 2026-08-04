'use client';

import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { DateRangePicker, type Period } from '@/components/dashboard/DateRangePicker';
import { useTopProducts } from '@/hooks/useAnalytics';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

const TrendingDishes = dynamic(() => import('@/components/dashboard/analytics/TrendingDishes').then(m => ({ default: m.TrendingDishes })), { ssr: false });
const NeverViewedProducts = dynamic(() => import('@/components/dashboard/analytics/NeverViewedProducts').then(m => ({ default: m.NeverViewedProducts })), { ssr: false });
const FavoriteProducts = dynamic(() => import('@/components/dashboard/analytics/FavoriteProducts').then(m => ({ default: m.FavoriteProducts })), { ssr: false });
const TopProductsChart = dynamic(() => import('@/components/dashboard/analytics/TopProductsChart').then(m => ({ default: m.TopProductsChart })), { ssr: false });
const LineAreaChart = dynamic(() => import('@/components/dashboard/charts/LineAreaChart').then(m => ({ default: m.LineAreaChart })), { ssr: false });
const ChartCard = dynamic(() => import('@/components/dashboard/charts/ChartCard').then(m => ({ default: m.ChartCard })), { ssr: false });

const supabase = createClient();

export default function InsightsPage() {
  const [period, setPeriod] = useState<Period>('month');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Customer Insights</h1>
        <p className="text-muted-foreground">Understand what customers love and discover untapped opportunities.</p>
      </div>

      <DateRangePicker value={period} onChange={setPeriod} />

      <div className="grid gap-6 md:grid-cols-3">
        <Suspense fallback={<LoadingPage />}>
          <TrendingDishes period={period} />
        </Suspense>
        <Suspense fallback={<LoadingPage />}>
          <NeverViewedProducts />
        </Suspense>
        <Suspense fallback={<LoadingPage />}>
          <FavoriteProducts />
        </Suspense>
      </div>

      <Suspense fallback={<LoadingPage />}>
        <RecentPopularityChart period={period} />
      </Suspense>
    </div>
  );
}

function RecentPopularityChart({ period }: { period: Period }) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'recent-popularity', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics')
        .select('created_at, event_type')
        .eq('event_type', 'product_view')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const dailyCounts = new Map<string, number>();
      (data || []).forEach((item) => {
        const day = new Date(item.created_at).toISOString().split('T')[0];
        dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
      });

      return Array.from(dailyCounts.entries())
        .map(([date, views]) => ({ date, views }))
        .slice(-30);
    },
    staleTime: 60 * 1000,
  });

  if (isLoading) return <div className="h-[300px] bg-muted animate-pulse rounded-lg" />;

  return (
    <ChartCard title="Recently Popular" description="Product views over time">
      <LineAreaChart
        data={data || []}
        xKey="date"
        yKey="views"
        color="#B8860B"
        height={300}
      />
    </ChartCard>
  );
}
