'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { SalesReportPeriod } from '@/lib/order/sales-range';

const PRESETS: Exclude<SalesReportPeriod, 'custom'>[] = ['today', 'week', 'month', 'year'];

interface SalesDateFilterProps {
  period: SalesReportPeriod;
  from: string;
  to: string;
  onPeriodChange: (period: Exclude<SalesReportPeriod, 'custom'>) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  error?: string | null;
  t: (key: string) => string;
}

export function SalesDateFilter({
  period,
  from,
  to,
  onPeriodChange,
  onFromChange,
  onToChange,
  error,
  t,
}: SalesDateFilterProps) {
  return (
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/90 sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-20 -mx-4 border-b px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:static md:z-auto md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('periodLabel')}>
          {PRESETS.map((key) => (
            <Button
              key={key}
              type="button"
              variant={period === key ? 'default' : 'outline'}
              size="sm"
              className="min-h-11 touch-manipulation px-3"
              onClick={() => onPeriodChange(key)}
            >
              {t(`period.${key}`)}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex min-h-11 flex-col gap-1.5">
            <Label htmlFor="sales-from">{t('from')}</Label>
            <input
              id="sales-from"
              type="date"
              value={from}
              onChange={(event) => onFromChange(event.target.value)}
              className="border-input bg-background ring-offset-background focus-visible:ring-ring min-h-11 w-full rounded-md border px-3 text-base tabular-nums outline-none focus-visible:ring-2"
            />
          </div>
          <div className="flex min-h-11 flex-col gap-1.5">
            <Label htmlFor="sales-to">{t('to')}</Label>
            <input
              id="sales-to"
              type="date"
              value={to}
              onChange={(event) => onToChange(event.target.value)}
              className="border-input bg-background ring-offset-background focus-visible:ring-ring min-h-11 w-full rounded-md border px-3 text-base tabular-nums outline-none focus-visible:ring-2"
            />
          </div>
        </div>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
