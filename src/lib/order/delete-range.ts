export const DELETE_RANGE_MAX_DAYS = 365;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function isDateOnly(value: string): boolean {
  return DATE_ONLY.test(value);
}

export function parseDateOnlyUtc(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function daysBetweenInclusive(from: string, to: string): number {
  const start = parseDateOnlyUtc(from);
  const end = parseDateOnlyUtc(to);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
}

export function toRangeBounds(from: string, to: string): { p_from: string; p_to: string } {
  return {
    p_from: `${from}T00:00:00.000Z`,
    p_to: `${to}T00:00:00.000Z`,
  };
}

export function rangeUpperExclusive(to: string): string {
  const end = parseDateOnlyUtc(to);
  end.setUTCDate(end.getUTCDate() + 1);
  return end.toISOString();
}

export type DeleteRangeValidationError = 'invalid_date' | 'invalid_range' | 'range_too_wide';

export function validateDeleteRange(from: string, to: string): DeleteRangeValidationError | null {
  if (!isDateOnly(from) || !isDateOnly(to)) return 'invalid_date';
  if (from > to) return 'invalid_range';
  if (daysBetweenInclusive(from, to) > DELETE_RANGE_MAX_DAYS) return 'range_too_wide';
  return null;
}
