import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOpportunities, usePipelineSummary, useTransitionOpportunity } from './use-opportunities';

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from '@/lib/api-client';

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('FR-042: useOpportunities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-042: fetches opportunities list', async () => {
    const mockResponse = {
      data: [{ id: 'opp-1', name: 'Big Deal', stage: 'prospect', estimatedValue: 10000 }],
      pagination: { cursor: null, hasMore: false, total: 1 },
    };
    vi.mocked(apiClient).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useOpportunities(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
  });

  test('FR-042: passes stage filter as query param', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({ data: [], pagination: { cursor: null, hasMore: false, total: 0 } });

    renderHook(() => useOpportunities({ stage: 'proposal' }), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(vi.mocked(apiClient)).toHaveBeenCalledWith(expect.stringContaining('stage=proposal'));
    });
  });
});

describe('FR-042: usePipelineSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-042: fetches pipeline summary with forecast', async () => {
    const mockResponse = {
      data: {
        stages: {
          prospect: { opportunities: [], count: 2, totalValue: 20000 },
        },
        forecast: { weightedTotal: 5000, totalOpenValue: 20000, opportunityCount: 2 },
      },
    };
    vi.mocked(apiClient).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => usePipelineSummary(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.forecast.weightedTotal).toBe(5000);
  });
});

describe('FR-042: useTransitionOpportunity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-042: transitions opportunity to new stage', async () => {
    const mockResponse = { data: { id: 'opp-1', name: 'Big Deal', stage: 'qualified' } };
    vi.mocked(apiClient).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useTransitionOpportunity(), { wrapper: createWrapper() });

    result.current.mutate({ opportunityId: 'opp-1', stage: 'qualified' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vi.mocked(apiClient)).toHaveBeenCalledWith(
      '/api/opportunities/opp-1/transition',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  test('FR-042: includes closeReason for closed stages', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({ data: { id: 'opp-1', stage: 'closed_won' } });

    const { result } = renderHook(() => useTransitionOpportunity(), { wrapper: createWrapper() });

    result.current.mutate({ opportunityId: 'opp-1', stage: 'closed_won', closeReason: 'Won the bid' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
