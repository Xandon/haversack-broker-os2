import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useAccountOpportunities } from './use-account-opportunities';

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

const MOCK_OPPORTUNITIES = {
  data: [
    {
      id: 'opp-1',
      name: 'New pasta line',
      estimatedValue: 15000,
      probability: 60,
      weightedValue: 9000,
      expectedCloseDate: '2026-04-15',
      stage: 'proposal',
      closeReason: null,
      closedAt: null,
      accountId: 'acc-1',
      accountName: 'Pacific Bistro',
      repId: 'user-1',
      repName: 'Jane Doe',
      brands: [{ id: 'brand-1', name: 'Artisan Pasta Co' }],
      isActive: true,
      createdAt: '2026-02-20T10:00:00Z',
      updatedAt: '2026-02-26T14:00:00Z',
    },
  ],
  pagination: { cursor: null, hasMore: false, total: 1 },
};

describe('FR-016: useAccountOpportunities hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-016: fetches opportunities filtered by accountId', async () => {
    mockApiClient.mockResolvedValue(MOCK_OPPORTUNITIES);

    const { result } = renderHook(
      () => useAccountOpportunities('acc-1'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].name).toBe('New pasta line');
    expect(result.current.data?.data[0].weightedValue).toBe(9000);
  });

  test('FR-016: includes accountId in query string', async () => {
    mockApiClient.mockResolvedValue(MOCK_OPPORTUNITIES);

    renderHook(
      () => useAccountOpportunities('acc-1'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());

    const callPath = mockApiClient.mock.calls[0][0] as string;
    expect(callPath).toContain('accountId=acc-1');
  });

  test('FR-016: handles error state', async () => {
    mockApiClient.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(
      () => useAccountOpportunities('acc-1'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
