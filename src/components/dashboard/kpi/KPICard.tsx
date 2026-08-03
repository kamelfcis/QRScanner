'use client';

import { Card, CardContent } from '@/components/ui/card';
import { MotionCard } from '@/components/shared/motion/MotionCard';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: { value: number; label: string };
  className?: string;
  color?: string;
}

export function KPICard({ title, value, icon, description, trend, className, color }: KPICardProps) {
  const trendIcon = trend
    ? trend.value > 0
      ? <TrendingUp className="h-3 w-3 text-green-500" />
      : trend.value < 0
        ? <TrendingDown className="h-3 w-3 text-red-500" />
        : <Minus className="h-3 w-3 text-muted-foreground" />
    : null;

  return (
    <MotionCard hover className={cn(className)}>
      <Card className="h-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
              {(description || trend) && (
                <div className="flex items-center gap-1 mt-1">
                  {trendIcon}
                  <p className="text-xs text-muted-foreground">
                    {trend ? `${Math.abs(trend.value)}% ${trend.label}` : description}
                  </p>
                </div>
              )}
            </div>
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                color || 'bg-brand-primary/10'
              )}
            >
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </MotionCard>
  );
}
