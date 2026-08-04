'use client';

import { usePeakHours } from '@/hooks/useAnalytics';
import { BarChart } from '@/components/dashboard/charts/BarChart';
import { ChartCard } from '@/components/dashboard/charts/ChartCard';
import type { Period } from '@/components/dashboard/DateRangePicker';
import { useTranslations } from '@/components/providers/RootI18nProvider';

interface PeakHoursChartProps {
  period: Period;
}

export function PeakHoursChart({ period }: PeakHoursChartProps) {
  const { data, isLoading } = usePeakHours(period);
  const t = useTranslations('analytics');

  if (isLoading) return <div className="h-[300px] bg-muted animate-pulse rounded-lg" />;

  const chartData = (data || []).map((item) => ({
    hour: `${item.hour.toString().padStart(2, '0')}:00`,
    count: item.count,
  }));

  return (
    <ChartCard title={t('peakHours')} description={t('activityByHour')}>
      <BarChart
        data={chartData}
        xKey="hour"
        yKey="count"
        color="#B8860B"
        height={300}
      />
    </ChartCard>
  );
}
