import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useAccountOrders } from './use-account-orders';

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

const MOCK_ORDERS = {
  data: [
    {
      id: 'ord-1',
      orderNumber: 'ORD-20260226-0001',
      accountId: 'acc-1',
      accountName: 'Pacific Bistro',
      repName: 'Jane Doe',
      status: 'confirmed',
      total: 1240.0,
      lineItemCount: 3,
      exportStatus: null,
      submittedAt: '2026-02-26T12:00:00Z',
      createdAt: '2026-02-26T10:00:00Z',
    },
  ],
  pagination: { cursor: null, hasMore: false, total: 1 },
};

describe('FR-002: useAccountOrders hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-002: fetches orders filtered by accountId', async () => {
    mockApiClient.mockResolvedValue(MOCK_ORDERS);

    const { result } = renderHook(
      () => useAccountOrders('acc-1'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].orderNumber).toBe('ORD-20260226-0001');
  });

  test('FR-002: includes accountId in query string', async () => {
    mockApiClient.mockResolvedValue(MOCK_ORDERS);

    renderHook(
      () => useAccountOrders('acc-1'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());

    const callPath = mockApiClient.mock.calls[0][0] as string;
    expect(callPath).toContain('accountId=acc-1');
    expect(callPath).toContain('sortBy=createdAt');
    expect(callPath).toContain('sortOrder=desc');
  });

  test('FR-002: handles error state', async () => {
    mockApiClient.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(
      () => useAccountOrders('acc-1'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
