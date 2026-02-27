import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createElement } from 'react';

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

import { useRepDashboard, useTeamDashboard, useCriticalAccounts } from './use-dashboard';

function createWrapper(): ({ children }: { children: ReactNode }) => React.ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): React.ReactElement {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useRepDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches rep dashboard data', async () => {
    const { apiClient } = await import('@/lib/api-client');
    const mockData = {
      revenue: { currentMonth: 5000, trailing12Months: 60000 },
      activities: { currentMonthCount: 15 },
      opportunities: { openCount: 3, weightedPipelineValue: 25000 },
      commissions: { currentMonth: 500, ytd: 3000 },
      accountHealth: { healthy: 10, atRisk: 3, critical: 1 },
      hasData: true,
      period: { start: '2026-02-01', end: '2026-02-28' },
    };
    (apiClient as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => useRepDashboard('current_month'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.revenue.currentMonth).toBe(5000);
  });

  it('uses correct query key for period', async () => {
    const { apiClient } = await import('@/lib/api-client');
    (apiClient as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: {} });

    const { result } = renderHook(() => useRepDashboard('ytd'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isFetched).toBe(true));
    expect(apiClient).toHaveBeenCalledWith('/api/dashboards/rep?period=ytd');
  });
});

describe('useTeamDashboard', () => {
  it('fetches team dashboard data', async () => {
    const { apiClient } = await import('@/lib/api-client');
    const mockData = {
      repRankings: [],
      totals: { totalRevenue: 100000, totalOrders: 50, totalActivities: 200, totalPipelineValue: 500000, activeRepCount: 9 },
      hasData: true,
      period: { start: '2026-02-01', end: '2026-02-28' },
    };
    (apiClient as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => useTeamDashboard('current_month'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.totals.activeRepCount).toBe(9);
  });
});

describe('useCriticalAccounts', () => {
  it('fetches critical accounts list', async () => {
    const { apiClient } = await import('@/lib/api-client');
    const mockData = [
      { id: '1', name: 'Test Account', healthScore: 15, territory: 'Portland' },
    ];
    (apiClient as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => useCriticalAccounts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe('Test Account');
  });
});
