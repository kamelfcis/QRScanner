import { describe, expect, it } from 'vitest';
import {
  getPriorPeriodBounds,
  getPriorPeriodCustomRange,
  isComparableReportPeriod,
  pctChange,
} from '@/lib/analytics/compare-period';

describe('pctChange', () => {
  it('returns percent delta when prior is non-zero', () => {
    expect(pctChange(120, 100)).toBe(20);
    expect(pctChange(80, 100)).toBe(-20);
  });

  it('returns 0 when both are zero', () => {
    expect(pctChange(0, 0)).toBe(0);
  });

  it('returns null when prior is zero and current is non-zero', () => {
    expect(pctChange(50, 0)).toBeNull();
  });
});

describe('isComparableReportPeriod', () => {
  it('allows today, week, and month only', () => {
    expect(isComparableReportPeriod('today')).toBe(true);
    expect(isComparableReportPeriod('week')).toBe(true);
    expect(isComparableReportPeriod('month')).toBe(true);
    expect(isComparableReportPeriod('year')).toBe(false);
    expect(isComparableReportPeriod('custom')).toBe(false);
  });
});

describe('getPriorPeriodBounds', () => {
  it('returns a single-day prior range ending before today', () => {
    const bounds = getPriorPeriodBounds('today');
    expect(bounds.end.getTime()).toBeLessThan(new Date().setHours(0, 0, 0, 0));
    expect(bounds.start.toDateString()).toBe(bounds.end.toDateString());
  });

  it('returns prior custom range stamps', () => {
    const range = getPriorPeriodCustomRange('month');
    expect(range.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.from <= range.to).toBe(true);
  });
});
