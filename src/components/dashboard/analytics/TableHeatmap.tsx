'use client';

import { useTableUsage } from '@/hooks/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function TableHeatmap() {
  const { data: tables, isLoading } = useTableUsage();

  if (isLoading) return <div className="h-[200px] bg-muted animate-pulse rounded-lg" />;

  if (!tables?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Table Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">No QR scan data yet</p>
        </CardContent>
      </Card>
    );
  }

  const maxScans = Math.max(...tables.map((t) => t.scans), 1);

  const getIntensity = (scans: number) => {
    const ratio = scans / maxScans;
    if (ratio < 0.25) return 'bg-brand-primary/10';
    if (ratio < 0.5) return 'bg-brand-primary/25';
    if (ratio < 0.75) return 'bg-brand-primary/50';
    return 'bg-brand-primary/80 text-white';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Table Usage Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {tables.map((table) => (
            <div
              key={table.table_number}
              className={cn(
                'aspect-square rounded-lg flex flex-col items-center justify-center transition-colors',
                getIntensity(table.scans)
              )}
            >
              <span className="text-lg font-bold">{table.table_number}</span>
              <span className="text-xs opacity-75">{table.scans} scans</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
