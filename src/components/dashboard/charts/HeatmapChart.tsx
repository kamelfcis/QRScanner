'use client';

import { cn } from '@/lib/utils';

interface HeatmapChartProps {
  data: { day: string; hours: number[] }[];
  maxValue?: number;
  className?: string;
}

export function HeatmapChart({ data, maxValue: maxProp, className }: HeatmapChartProps) {
  const maxValue = maxProp || Math.max(...data.flatMap((d) => d.hours), 1);

  const getIntensity = (value: number) => {
    const ratio = value / maxValue;
    if (ratio === 0) return 'bg-muted';
    if (ratio < 0.25) return 'bg-brand-primary/10';
    if (ratio < 0.5) return 'bg-brand-primary/25';
    if (ratio < 0.75) return 'bg-brand-primary/50';
    return 'bg-brand-primary/80';
  };

  return (
    <div className={cn('overflow-x-auto', className)}>
      <div className="min-w-[600px]">
        <div className="grid gap-1" style={{ gridTemplateColumns: '60px repeat(24, 1fr)' }}>
          <div className="text-xs text-muted-foreground" />
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} className="text-center text-[10px] text-muted-foreground">
              {i}
            </div>
          ))}
          {data.map((row) => (
            <>
              <div key={`label-${row.day}`} className="text-xs text-muted-foreground flex items-center">
                {row.day.slice(0, 3)}
              </div>
              {row.hours.map((value, hourIndex) => (
                <div
                  key={`${row.day}-${hourIndex}`}
                  className={cn(
                    'aspect-square rounded-sm transition-colors',
                    getIntensity(value)
                  )}
                  title={`${row.day} ${hourIndex}:00 - ${value} events`}
                />
              ))}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
