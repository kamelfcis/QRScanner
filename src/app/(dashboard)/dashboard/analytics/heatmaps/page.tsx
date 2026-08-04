'use client';

import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { DateRangePicker, type Period } from '@/components/dashboard/DateRangePicker';
import { useTableUsage } from '@/hooks/useAnalytics';
import { Badge } from '@/components/ui/badge';
import { LoadingPage } from '@/components/shared/feedback/LoadingSpinner';

const PeakHoursChart = dynamic(() => import('@/components/dashboard/analytics/PeakHoursChart').then(m => ({ default: m.PeakHoursChart })), { ssr: false });
const PeakDaysChart = dynamic(() => import('@/components/dashboard/analytics/PeakDaysChart').then(m => ({ default: m.PeakDaysChart })), { ssr: false });
const TableHeatmap = dynamic(() => import('@/components/dashboard/analytics/TableHeatmap').then(m => ({ default: m.TableHeatmap })), { ssr: false });

export default function HeatmapsPage() {
  const [period, setPeriod] = useState<Period>('month');
  const { data: tables } = useTableUsage();

  const sorted = tables
    ? [...tables].sort((a, b) => b.scans - a.scans)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Heatmaps</h1>
        <p className="text-muted-foreground">Visualize activity patterns and table popularity.</p>
      </div>

      <DateRangePicker value={period} onChange={setPeriod} />

      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<LoadingPage />}>
          <PeakHoursChart period={period} />
        </Suspense>
        <Suspense fallback={<LoadingPage />}>
          <PeakDaysChart period={period} />
        </Suspense>
      </div>

      <Suspense fallback={<LoadingPage />}>
        <TableHeatmap />
      </Suspense>

      {sorted.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Most popular:</span>
            <Badge className="bg-brand-primary/20 text-brand-primary">
              Table {sorted[0].table_number} ({sorted[0].scans} scans)
            </Badge>
          </div>
          {sorted.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Least popular:</span>
              <Badge variant="outline">
                Table {sorted[sorted.length - 1].table_number} ({sorted[sorted.length - 1].scans} scans)
              </Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
