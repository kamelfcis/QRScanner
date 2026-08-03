'use client';

import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

interface LineAreaChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  yKey2?: string;
  color?: string;
  color2?: string;
  type?: 'line' | 'area';
  height?: number;
  className?: string;
  formatter?: (value: number) => string;
}

export function LineAreaChart({
  data,
  xKey,
  yKey,
  yKey2,
  color = '#B8860B',
  color2 = '#8B0000',
  type = 'area',
  height = 300,
  className,
  formatter,
}: LineAreaChartProps) {
  const Chart = type === 'area' ? AreaChart : LineChart;
  const DataElement = type === 'area' ? Area : Line;

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <Chart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey={xKey} className="text-xs" tick={{ fontSize: 12 }} />
          <YAxis className="text-xs" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={formatter ? ((value: string | number | (string | number)[]) => [formatter(Number(value)), yKey]) as never : undefined}
          />
          <DataElement
            type="monotone"
            dataKey={yKey}
            stroke={color}
            fill={type === 'area' ? color : undefined}
            fillOpacity={type === 'area' ? 0.1 : undefined}
            strokeWidth={2}
          />
          {yKey2 && (
            <DataElement
              type="monotone"
              dataKey={yKey2}
              stroke={color2}
              fill={type === 'area' ? color2 : undefined}
              fillOpacity={type === 'area' ? 0.1 : undefined}
              strokeWidth={2}
            />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
