import { describe, test, expect } from 'vitest';
import { resolveDateRange, resolveTrailing12Months, formatDateRangeForResponse } from '../dashboard-date.util';

describe('FR-023/024: Dashboard date utility', () => {
  const referenceDate = new Date(Date.UTC(2026, 1, 15)); // Feb 15, 2026

  describe('resolveDateRange', () => {
    test('FR-023: current_month returns first to last day of current month', () => {
      const range = resolveDateRange('current_month', undefined, undefined, referenceDate);
      expect(range.start).toEqual(new Date(Date.UTC(2026, 1, 1)));
      expect(range.end).toEqual(new Date(Date.UTC(2026, 2, 1)));
    });

    test('FR-023: last_month returns first to last day of previous month', () => {
      const range = resolveDateRange('last_month', undefined, undefined, referenceDate);
      expect(range.start).toEqual(new Date(Date.UTC(2026, 0, 1)));
      expect(range.end).toEqual(new Date(Date.UTC(2026, 1, 1)));
    });

    test('FR-023: current_quarter returns Q1 boundaries for Feb date', () => {
      const range = resolveDateRange('current_quarter', undefined, undefined, referenceDate);
      expect(range.start).toEqual(new Date(Date.UTC(2026, 0, 1)));
      expect(range.end).toEqual(new Date(Date.UTC(2026, 3, 1)));
    });

    test('FR-023: last_quarter returns Q4 2025 for Feb 2026 date', () => {
      const range = resolveDateRange('last_quarter', undefined, undefined, referenceDate);
      expect(range.start).toEqual(new Date(Date.UTC(2025, 9, 1)));
      expect(range.end).toEqual(new Date(Date.UTC(2026, 0, 1)));
    });

    test('FR-023: ytd returns Jan 1 to end of current month', () => {
      const range = resolveDateRange('ytd', undefined, undefined, referenceDate);
      expect(range.start).toEqual(new Date(Date.UTC(2026, 0, 1)));
      expect(range.end).toEqual(new Date(Date.UTC(2026, 2, 1)));
    });

    test('FR-023: trailing_12_months returns 12 months back from current month', () => {
      const range = resolveDateRange('trailing_12_months', undefined, undefined, referenceDate);
      expect(range.start).toEqual(new Date(Date.UTC(2025, 1, 1)));
      expect(range.end).toEqual(new Date(Date.UTC(2026, 1, 1)));
    });

    test('FR-023: custom returns exact date boundaries', () => {
      const range = resolveDateRange('custom', '2025-10-01', '2025-12-31', referenceDate);
      expect(range.start).toEqual(new Date('2025-10-01T00:00:00.000Z'));
      expect(range.end).toEqual(new Date('2025-12-31T23:59:59.999Z'));
    });

    test('FR-023: custom throws when dates are missing', () => {
      expect(() => resolveDateRange('custom', undefined, undefined, referenceDate)).toThrow(
        'start_date and end_date are required for custom period',
      );
    });
  });

  describe('resolveTrailing12Months', () => {
    test('FR-023: returns 12-month window from first of current month', () => {
      const range = resolveTrailing12Months(referenceDate);
      expect(range.start).toEqual(new Date(Date.UTC(2025, 1, 1)));
      expect(range.end).toEqual(new Date(Date.UTC(2026, 1, 1)));
    });
  });

  describe('formatDateRangeForResponse', () => {
    test('FR-023: formats dates as ISO date strings', () => {
      const formatted = formatDateRangeForResponse({
        start: new Date(Date.UTC(2026, 1, 1)),
        end: new Date(Date.UTC(2026, 2, 1)),
      });
      expect(formatted.start).toBe('2026-02-01');
      expect(formatted.end).toBe('2026-03-01');
    });
  });
});
