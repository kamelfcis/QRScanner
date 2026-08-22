import { describe, it, expect } from 'vitest';
import {
  daysBetweenInclusive,
  validateDeleteRange,
  toRangeBounds,
  rangeUpperExclusive,
  DELETE_RANGE_MAX_DAYS,
} from '@/lib/order/delete-range';
import { deleteOrdersInRangeSchema } from '@/types/schema';

describe('validateDeleteRange', () => {
  it('accepts valid inclusive range', () => {
    expect(validateDeleteRange('2026-08-01', '2026-08-15')).toBeNull();
  });

  it('rejects when from is after to', () => {
    expect(validateDeleteRange('2026-08-16', '2026-08-01')).toBe('invalid_range');
  });

  it('rejects ranges wider than 365 days', () => {
    expect(validateDeleteRange('2025-01-01', '2026-01-01')).toBe('range_too_wide');
  });

  it('accepts exactly 365 days', () => {
    const from = '2025-08-16';
    const to = '2026-08-15';
    expect(daysBetweenInclusive(from, to)).toBe(DELETE_RANGE_MAX_DAYS);
    expect(validateDeleteRange(from, to)).toBeNull();
  });

  it('rejects invalid date format', () => {
    expect(validateDeleteRange('08-15-2026', '2026-08-15')).toBe('invalid_date');
  });
});

describe('toRangeBounds', () => {
  it('maps date-only inputs to UTC day boundaries', () => {
    expect(toRangeBounds('2026-08-01', '2026-08-15')).toEqual({
      p_from: '2026-08-01T00:00:00.000Z',
      p_to: '2026-08-15T00:00:00.000Z',
    });
    expect(rangeUpperExclusive('2026-08-15')).toBe('2026-08-16T00:00:00.000Z');
  });
});

describe('deleteOrdersInRangeSchema', () => {
  it('accepts valid payload', () => {
    const result = deleteOrdersInRangeSchema.safeParse({
      from: '2026-08-01',
      to: '2026-08-15',
      statuses: ['completed', 'cancelled'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects inverted dates', () => {
    const result = deleteOrdersInRangeSchema.safeParse({
      from: '2026-08-20',
      to: '2026-08-01',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'invalid_range')).toBe(true);
    }
  });

  it('rejects ranges over 365 days', () => {
    const result = deleteOrdersInRangeSchema.safeParse({
      from: '2024-01-01',
      to: '2026-01-01',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'range_too_wide')).toBe(true);
    }
  });
});
