'use client';

import { useDeviceBreakdown } from '@/hooks/useAnalytics';
import { PieDonutChart } from '@/components/dashboard/charts/PieDonutChart';
import { ChartCard } from '@/components/dashboard/charts/ChartCard';
import type { Period } from '@/components/dashboard/DateRangePicker';
import { useTranslations } from '@/components/providers/RootI18nProvider';

interface DeviceBreakdownProps {
  period: Period;
}

const DEVICE_COLORS: Record<string, string> = {
  desktop: '#B8860B',
  mobile: '#8B0000',
  tablet: '#FFD700',
};

export function DeviceBreakdown({ period }: DeviceBreakdownProps) {
  const { data, isLoading } = useDeviceBreakdown(period);
  const t = useTranslations('analytics');

  if (isLoading) return <div className="h-[300px] bg-muted animate-pulse rounded-lg" />;

  const chartData = (data || []).map((item) => ({
    name: item.device.charAt(0).toUpperCase() + item.device.slice(1),
    value: item.count,
    color: DEVICE_COLORS[item.device.toLowerCase()] || '#B8860B',
  }));

  return (
    <ChartCard title={t('deviceBreakdown')} description={t('visitorsByDevice')}>
      <PieDonutChart data={chartData} donut height={300} />
    </ChartCard>
  );
}
