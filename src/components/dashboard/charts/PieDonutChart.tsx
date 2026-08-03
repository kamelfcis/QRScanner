'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { cn } from '@/lib/utils';

interface PieDonutChartProps {
  data: { name: string; value: number; color?: string }[];
  colors?: string[];
  height?: number;
  className?: string;
  donut?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

const DEFAULT_COLORS = ['#B8860B', '#8B0000', '#FFD700', '#DAA520', '#A52A2A', '#228B22', '#4169E1', '#9370DB'];

export function PieDonutChart({
  data,
  colors = DEFAULT_COLORS,
  height = 300,
  className,
  donut = false,
  innerRadius = 60,
  outerRadius = 100,
}: PieDonutChartProps) {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={donut ? innerRadius : 0}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={data[index].color || colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend
            formatter={(value) => <span className="text-sm">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
