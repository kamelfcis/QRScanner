'use client';

import { useAnalyticsSummary } from '@/hooks/useAnalytics';
import { LineAreaChart } from '@/components/dashboard/charts/LineAreaChart';
import { ChartCard } from '@/components/dashboard/charts/ChartCard';
import type { Period } from '@/components/dashboard/DateRangePicker';

interface QRScansChartProps {
  period: Period;
}

export function QRScansChart({ period }: QRScansChartProps) {
  const { data, isLoading } = useAnalyticsSummary(period);

  if (isLoading) return <div className="h-[300px] bg-muted animate-pulse rounded-lg" />;

  const scansData = (data || []).map((item) => ({
    ...item,
    scans: item.scans || 0,
  }));

  return (
    <ChartCard title="QR Code Scans" description="Scan activity over time">
      <LineAreaChart
        data={scansData as unknown as Record<string, unknown>[]}
        xKey="date"
        yKey="scans"
        color="#8B0000"
        height={300}
      />
    </ChartCard>
  );
}
