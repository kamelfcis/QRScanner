'use client';

import { useAnalyticsSummary } from '@/hooks/useAnalytics';
import { LineAreaChart } from '@/components/dashboard/charts/LineAreaChart';
import { ChartCard } from '@/components/dashboard/charts/ChartCard';
import type { Period } from '@/components/dashboard/DateRangePicker';

interface VisitorsChartProps {
  period: Period;
}

export function VisitorsChart({ period }: VisitorsChartProps) {
  const { data, isLoading } = useAnalyticsSummary(period);

  if (isLoading) return <div className="h-[300px] bg-muted animate-pulse rounded-lg" />;

  return (
    <ChartCard title="Visitors & Scans" description="Daily traffic over time">
      <LineAreaChart
        data={(data || []) as unknown as Record<string, unknown>[]}
        xKey="date"
        yKey="visitors"
        yKey2="scans"
        color="#B8860B"
        color2="#8B0000"
        height={300}
      />
    </ChartCard>
  );
}
