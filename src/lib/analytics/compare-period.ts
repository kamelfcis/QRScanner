import {
  endOfDay,
  endOfMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import type { SalesReportPeriod } from '@/lib/order/sales-range';

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export type ComparableReportPeriod = 'today' | 'week' | 'month';

export function isComparableReportPeriod(
  period: SalesReportPeriod
): period is ComparableReportPeriod {
  return period === 'today' || period === 'week' || period === 'month';
}

export function getPriorPeriodBounds(period: ComparableReportPeriod): { start: Date; end: Date } {
  const now = new Date();
  switch (period) {
    case 'today': {
      const day = subDays(now, 1);
      return { start: startOfDay(day), end: endOfDay(day) };
    }
    case 'week': {
      const priorEnd = subDays(startOfWeek(now, { weekStartsOn: 1 }), 1);
      return {
        start: startOfWeek(priorEnd, { weekStartsOn: 1 }),
        end: endOfDay(priorEnd),
      };
    }
    case 'month': {
      const prior = subMonths(now, 1);
      return { start: startOfMonth(prior), end: endOfMonth(prior) };
    }
  }
}

/** Custom range for useSalesReport when comparing to the prior preset period. */
export function getPriorPeriodCustomRange(period: ComparableReportPeriod): {
  from: string;
  to: string;
} {
  const { start, end } = getPriorPeriodBounds(period);
  const year = (d: Date) => d.getFullYear();
  const month = (d: Date) => String(d.getMonth() + 1).padStart(2, '0');
  const day = (d: Date) => String(d.getDate()).padStart(2, '0');
  return {
    from: `${year(start)}-${month(start)}-${day(start)}`,
    to: `${year(end)}-${month(end)}-${day(end)}`,
  };
}
