import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useAccounts } from './use-accounts';

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from '@/lib/api-client';

const mockApiClient = vi.mocked(apiClient);

function createWrapper(): React.ComponentType<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('FR-033a: useAccounts hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-033a: fetches accounts with default parameters', async () => {
    const mockResponse = {
      data: [
        {
          id: 'acc-1',
          name: 'Pacific Foods',
          accountType: 'restaurant',
          territoryId: 'ter-1',
          territory: { id: 'ter-1', name: 'Portland Metro' },
          healthScore: 75,
          updatedAt: '2026-02-27T10:00:00Z',
        },
      ],
      pagination: { cursor: null, hasMore: false, total: 1 },
    };

    mockApiClient.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAccounts({}), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].name).toBe('Pacific Foods');
    expect(result.current.data?.pagination.total).toBe(1);
  });

  test('FR-033j: builds correct query string with filters', async () => {
    mockApiClient.mockResolvedValue({
      data: [],
      pagination: { cursor: null, hasMore: false, total: 0 },
    });

    renderHook(
      () =>
        useAccounts({
          territoryId: 'ter-1',
          accountType: 'restaurant',
          healthScoreMin: 0,
          healthScoreMax: 39,
          sortBy: 'healthScore',
          sortOrder: 'asc',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());

    const callPath = mockApiClient.mock.calls[0][0] as string;
    expect(callPath).toContain('territoryId=ter-1');
    expect(callPath).toContain('accountType=restaurant');
    expect(callPath).toContain('healthScoreMin=0');
    expect(callPath).toContain('healthScoreMax=39');
    expect(callPath).toContain('sortBy=healthScore');
    expect(callPath).toContain('sortOrder=asc');
  });

  test('FR-033i: includes search parameter when provided', async () => {
    mockApiClient.mockResolvedValue({
      data: [],
      pagination: { cursor: null, hasMore: false, total: 0 },
    });

    renderHook(() => useAccounts({ search: 'pacific' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());

    const callPath = mockApiClient.mock.calls[0][0] as string;
    expect(callPath).toContain('search=pacific');
  });

  test('FR-033e: includes cursor parameter for pagination', async () => {
    mockApiClient.mockResolvedValue({
      data: [],
      pagination: { cursor: null, hasMore: false, total: 0 },
    });

    renderHook(() => useAccounts({ cursor: 'cursor-abc' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());

    const callPath = mockApiClient.mock.calls[0][0] as string;
    expect(callPath).toContain('cursor=cursor-abc');
  });

  test('FR-033a: handles error state', async () => {
    mockApiClient.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAccounts({}), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
