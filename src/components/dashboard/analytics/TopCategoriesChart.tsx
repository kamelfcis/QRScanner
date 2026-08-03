'use client';

import { useTopCategories } from '@/hooks/useAnalytics';
import { BarChart } from '@/components/dashboard/charts/BarChart';
import { ChartCard } from '@/components/dashboard/charts/ChartCard';
import { DataTable } from '@/components/dashboard/DataTable';
import type { Period } from '@/components/dashboard/DateRangePicker';

interface TopCategoriesChartProps {
  period: Period;
}

export function TopCategoriesChart({ period }: TopCategoriesChartProps) {
  const { data, isLoading } = useTopCategories(period);

  if (isLoading) return <div className="h-[400px] bg-muted animate-pulse rounded-lg" />;

  const chartData = (data || []).map((cat) => ({
    name: cat.name_ar || cat.name,
    views: cat.views,
  }));

  const tableRows = (data || []).map((cat, i) => [
    i + 1,
    cat.name_ar || cat.name,
    cat.views,
  ]);

  return (
    <div className="space-y-4">
      <ChartCard title="Most Viewed Categories" description="Top categories by views">
        <BarChart
          data={chartData}
          xKey="name"
          yKey="views"
          horizontal
          color="#FFD700"
          height={300}
        />
      </ChartCard>
      <DataTable
        title="Category Views Data"
        headers={['#', 'Category', 'Views']}
        rows={tableRows}
        filename="category-views"
      />
    </div>
  );
}
