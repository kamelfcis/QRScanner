'use client';

import { usePeakDays } from '@/hooks/useAnalytics';
import { BarChart } from '@/components/dashboard/charts/BarChart';
import { ChartCard } from '@/components/dashboard/charts/ChartCard';
import type { Period } from '@/components/dashboard/DateRangePicker';

interface PeakDaysChartProps {
  period: Period;
}

export function PeakDaysChart({ period }: PeakDaysChartProps) {
  const { data, isLoading } = usePeakDays(period);

  if (isLoading) return <div className="h-[300px] bg-muted animate-pulse rounded-lg" />;

  return (
    <ChartCard title="Peak Days" description="Activity by day of week">
      <BarChart
        data={(data || []).map((d) => ({ day: d.day.slice(0, 3), count: d.count }))}
        xKey="day"
        yKey="count"
        color="#B8860B"
        height={300}
      />
    </ChartCard>
  );
}
