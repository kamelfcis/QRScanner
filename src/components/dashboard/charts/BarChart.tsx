'use client';

import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/lib/utils';

interface BarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
  colors?: string[];
  height?: number;
  className?: string;
  horizontal?: boolean;
  formatter?: (value: number) => string;
}

export function BarChart({
  data,
  xKey,
  yKey,
  color = '#B8860B',
  colors,
  height = 300,
  className,
  horizontal = false,
  formatter,
}: BarChartProps) {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          {horizontal ? (
            <>
              <XAxis type="number" className="text-xs" tick={{ fontSize: 12 }} />
              <YAxis dataKey={xKey} type="category" className="text-xs" tick={{ fontSize: 12 }} width={80} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} className="text-xs" tick={{ fontSize: 12 }} />
              <YAxis className="text-xs" tick={{ fontSize: 12 }} />
            </>
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={formatter ? ((value: string | number | (string | number)[]) => [formatter(Number(value)), yKey]) as never : undefined}
          />
          <Bar dataKey={yKey} radius={[4, 4, 0, 0]}>
            {colors && data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
            {!colors && <Cell fill={color} />}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
