'use client';

import { useTopProducts } from '@/hooks/useAnalytics';
import { BarChart } from '@/components/dashboard/charts/BarChart';
import { ChartCard } from '@/components/dashboard/charts/ChartCard';
import { DataTable } from '@/components/dashboard/DataTable';
import type { Period } from '@/components/dashboard/DateRangePicker';

interface TopProductsChartProps {
  period: Period;
}

export function TopProductsChart({ period }: TopProductsChartProps) {
  const { data, isLoading } = useTopProducts(period);

  if (isLoading) return <div className="h-[400px] bg-muted animate-pulse rounded-lg" />;

  const chartData = (data || []).map((prod) => ({
    name: prod.name || prod.id,
    views: prod.views,
  }));

  const tableRows = (data || []).map((prod, i) => [
    i + 1,
    prod.name || prod.id,
    prod.views,
  ]);

  return (
    <div className="space-y-4">
      <ChartCard title="Most Viewed Products" description="Top products by views">
        <BarChart
          data={chartData}
          xKey="name"
          yKey="views"
          horizontal
          color="#B8860B"
          height={300}
        />
      </ChartCard>
      <DataTable
        title="Product Views Data"
        headers={['#', 'Product', 'Views']}
        rows={tableRows}
        filename="product-views"
      />
    </div>
  );
}
