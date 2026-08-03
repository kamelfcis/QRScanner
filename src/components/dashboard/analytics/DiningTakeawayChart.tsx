'use client';

import { useDiningTakeaway } from '@/hooks/useAnalytics';
import { PieDonutChart } from '@/components/dashboard/charts/PieDonutChart';
import { ChartCard } from '@/components/dashboard/charts/ChartCard';
import type { Period } from '@/components/dashboard/DateRangePicker';

interface DiningTakeawayChartProps {
  period: Period;
}

export function DiningTakeawayChart({ period }: DiningTakeawayChartProps) {
  const { data, isLoading } = useDiningTakeaway(period);

  if (isLoading) return <div className="h-[300px] bg-muted animate-pulse rounded-lg" />;

  const chartData = [
    { name: 'Dining', value: data?.dining || 0, color: '#B8860B' },
    { name: 'Takeaway', value: data?.takeaway || 0, color: '#8B0000' },
  ];

  return (
    <ChartCard title="Dining vs Takeaway" description="Order type breakdown">
      <PieDonutChart data={chartData} donut height={300} />
    </ChartCard>
  );
}
