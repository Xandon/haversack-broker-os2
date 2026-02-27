import { describe, it, expect } from 'vitest';
import { cn, formatCurrency, formatNumber, formatDate } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('resolves tailwind conflicts', () => {
    const result = cn('p-4', 'p-2');
    expect(result).toBe('p-2');
  });

  it('handles empty inputs', () => {
    expect(cn()).toBe('');
  });
});

describe('formatCurrency', () => {
  it('formats positive amounts as USD', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats negative amounts', () => {
    expect(formatCurrency(-500)).toContain('500.00');
  });

  it('formats large numbers with commas', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000.00');
  });
});

describe('formatNumber', () => {
  it('formats integers with commas', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('formats small numbers without commas', () => {
    expect(formatNumber(42)).toBe('42');
  });
});

describe('formatDate', () => {
  it('formats ISO string date', () => {
    // Use midday UTC to avoid timezone date-shift
    const result = formatDate('2026-01-15T12:00:00Z');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('2026');
  });

  it('formats Date object', () => {
    const result = formatDate(new Date('2026-06-01'));
    expect(result).toContain('2026');
  });
});
