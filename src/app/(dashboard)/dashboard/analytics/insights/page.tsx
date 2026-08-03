'use client';

import { useState } from 'react';
import { DateRangePicker, type Period } from '@/components/dashboard/DateRangePicker';
import { TrendingDishes } from '@/components/dashboard/analytics/TrendingDishes';
import { NeverViewedProducts } from '@/components/dashboard/analytics/NeverViewedProducts';
import { FavoriteProducts } from '@/components/dashboard/analytics/FavoriteProducts';
import { TopProductsChart } from '@/components/dashboard/analytics/TopProductsChart';
import { useTopProducts } from '@/hooks/useAnalytics';
import { LineAreaChart } from '@/components/dashboard/charts/LineAreaChart';
import { ChartCard } from '@/components/dashboard/charts/ChartCard';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export default function InsightsPage() {
  const [period, setPeriod] = useState<Period>('month');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Customer Insights</h1>
        <p className="text-muted-foreground">Understand what customers love and discover untapped opportunities.</p>
      </div>

      <DateRangePicker value={period} onChange={setPeriod} />

      <div className="grid gap-6 md:grid-cols-3">
        <TrendingDishes period={period} />
        <NeverViewedProducts />
        <FavoriteProducts />
      </div>

      <RecentPopularityChart period={period} />
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
