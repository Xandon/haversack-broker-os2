import type { DashboardPeriod } from '@haversack/shared';

export interface DateRange {
  start: Date;
  end: Date;
}

export function resolveDateRange(
  period: DashboardPeriod,
  startDate?: string,
  endDate?: string,
  now: Date = new Date(),
): DateRange {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  switch (period) {
    case 'current_month':
      return {
        start: new Date(Date.UTC(year, month, 1)),
        end: new Date(Date.UTC(year, month + 1, 1)),
      };
    case 'last_month':
      return {
        start: new Date(Date.UTC(year, month - 1, 1)),
        end: new Date(Date.UTC(year, month, 1)),
      };
    case 'current_quarter': {
      const qStart = Math.floor(month / 3) * 3;
      return {
        start: new Date(Date.UTC(year, qStart, 1)),
        end: new Date(Date.UTC(year, qStart + 3, 1)),
      };
    }
    case 'last_quarter': {
      const curQStart = Math.floor(month / 3) * 3;
      return {
        start: new Date(Date.UTC(year, curQStart - 3, 1)),
        end: new Date(Date.UTC(year, curQStart, 1)),
      };
    }
    case 'ytd':
      return {
        start: new Date(Date.UTC(year, 0, 1)),
        end: new Date(Date.UTC(year, month + 1, 1)),
      };
    case 'trailing_12_months':
      return resolveTrailing12Months(now);
    case 'custom': {
      if (!startDate || !endDate) {
        throw new Error('start_date and end_date are required for custom period');
      }
      return {
        start: new Date(startDate + 'T00:00:00.000Z'),
        end: new Date(endDate + 'T23:59:59.999Z'),
      };
    }
    default:
      return {
        start: new Date(Date.UTC(year, month, 1)),
        end: new Date(Date.UTC(year, month + 1, 1)),
      };
  }
}

export function resolveTrailing12Months(now: Date = new Date()): DateRange {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return {
    start: new Date(Date.UTC(year - 1, month, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

export function formatDateRangeForResponse(range: DateRange): { start: string; end: string } {
  return {
    start: range.start.toISOString().split('T')[0]!,
    end: range.end.toISOString().split('T')[0]!,
  };
}
