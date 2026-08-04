'use client';

import { useDiningTakeaway } from '@/hooks/useAnalytics';
import { PieDonutChart } from '@/components/dashboard/charts/PieDonutChart';
import { ChartCard } from '@/components/dashboard/charts/ChartCard';
import { useTheme } from '@/components/providers/ThemeProvider';
import type { Period } from '@/components/dashboard/DateRangePicker';
import { useTranslations } from '@/components/providers/RootI18nProvider';

interface DiningTakeawayChartProps {
  period: Period;
}

export function DiningTakeawayChart({ period }: DiningTakeawayChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { data, isLoading } = useDiningTakeaway(period);
  const t = useTranslations('analytics');

  if (isLoading) return <div className="h-[300px] bg-muted animate-pulse rounded-lg" />;

  const chartData = [
    { name: 'Dining', value: data?.dining || 0, color: isDark ? '#DAA520' : '#B8860B' },
    { name: 'Takeaway', value: data?.takeaway || 0, color: isDark ? '#A52A2A' : '#8B0000' },
  ];

  return (
    <ChartCard title={t('diningVsTakeaway')} description={t('orderTypeBreakdown')}>
      <PieDonutChart data={chartData} donut height={300} />
    </ChartCard>
  );
}
