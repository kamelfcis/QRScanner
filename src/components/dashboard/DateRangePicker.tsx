'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const periods = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: '7 Days' },
  { key: 'month', label: '30 Days' },
  { key: 'year', label: '1 Year' },
] as const;

export type Period = (typeof periods)[number]['key'];

interface DateRangePickerProps {
  value: Period;
  onChange: (period: Period) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  return (
    <div className={cn('flex gap-1', className)}>
      {periods.map((period) => (
        <Button
          key={period.key}
          variant={value === period.key ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(period.key)}
          className="h-8 text-xs"
        >
          {period.label}
        </Button>
      ))}
    </div>
  );
}
