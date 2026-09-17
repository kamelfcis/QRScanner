import { endOfDay, startOfDay } from 'date-fns';
import {
  isDateOnly,
  validateDeleteRange,
  type DeleteRangeValidationError,
} from '@/lib/order/delete-range';

export type SalesReportPeriod = 'today' | 'week' | 'month' | 'year' | 'custom';

export type SalesReportBoundsError = DeleteRangeValidationError;

export type SalesReportBoundsResult =
  { ok: true; start: Date; end: Date } | { ok: false; error: SalesReportBoundsError };

export function parseLocalDateOnly(value: string): Date | null {
  if (!isDateOnly(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function dateOnlyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function resolveCustomSalesBounds(from?: string, to?: string): SalesReportBoundsResult {
  const validation = validateDeleteRange(from ?? '', to ?? '');
  if (validation) return { ok: false, error: validation };

  const fromDate = parseLocalDateOnly(from ?? '');
  const toDate = parseLocalDateOnly(to ?? '');
  if (!fromDate || !toDate) return { ok: false, error: 'invalid_date' };

  return { ok: true, start: startOfDay(fromDate), end: endOfDay(toDate) };
}
