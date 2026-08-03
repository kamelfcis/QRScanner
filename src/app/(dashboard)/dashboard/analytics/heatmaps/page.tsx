'use client';

import { useState } from 'react';
import { DateRangePicker, type Period } from '@/components/dashboard/DateRangePicker';
import { PeakHoursChart } from '@/components/dashboard/analytics/PeakHoursChart';
import { PeakDaysChart } from '@/components/dashboard/analytics/PeakDaysChart';
import { TableHeatmap } from '@/components/dashboard/analytics/TableHeatmap';
import { useTableUsage } from '@/hooks/useAnalytics';
import { Badge } from '@/components/ui/badge';

export default function HeatmapsPage() {
  const [period, setPeriod] = useState<Period>('month');
  const { data: tables } = useTableUsage();

  const sorted = tables
    ? [...tables].sort((a, b) => b.scans - a.scans)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Heatmaps</h1>
        <p className="text-muted-foreground">Visualize activity patterns and table popularity.</p>
      </div>

      <DateRangePicker value={period} onChange={setPeriod} />

      <div className="grid gap-6 md:grid-cols-2">
        <PeakHoursChart period={period} />
        <PeakDaysChart period={period} />
      </div>

      <TableHeatmap />

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
