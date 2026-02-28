import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useOrders, useOrder, useCreateOrder, useSubmitOrder, useCancelOrder, useApprovalQueue } from './use-orders';

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

const MOCK_ORDER_LIST = {
  data: [
    {
      id: 'ord-1',
      orderNumber: 'ORD-20260226-0001',
      accountId: 'acc-1',
      accountName: 'Pacific Foods',
      repName: 'Jane Doe',
      status: 'draft' as const,
      total: 1240.0,
      lineItemCount: 3,
      exportStatus: null,
      submittedAt: null,
      createdAt: '2026-02-26T10:00:00Z',
    },
  ],
  pagination: { cursor: null, hasMore: false, total: 1 },
};

const MOCK_ORDER_DETAIL = {
  data: {
    id: 'ord-1',
    orderNumber: 'ORD-20260226-0001',
    accountId: 'acc-1',
    accountName: 'Pacific Foods',
    repId: 'user-1',
    repName: 'Jane Doe',
    status: 'draft' as const,
    subtotal: 1240.0,
    tax: 0,
    total: 1240.0,
    notes: null,
    lineItems: [],
    vendorSubOrders: [],
    approvals: [],
    exportStatus: null,
    submittedAt: null,
    confirmedAt: null,
    cancelledAt: null,
    version: 1,
    createdAt: '2026-02-26T10:00:00Z',
    updatedAt: '2026-02-26T10:00:00Z',
  },
};

describe('FR-011: useOrders hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-011: fetches orders with default parameters', async () => {
    mockApiClient.mockResolvedValue(MOCK_ORDER_LIST);

    const { result } = renderHook(() => useOrders({}), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].orderNumber).toBe('ORD-20260226-0001');
    expect(result.current.data?.pagination.total).toBe(1);
  });

  test('FR-011: builds correct query string with filters', async () => {
    mockApiClient.mockResolvedValue(MOCK_ORDER_LIST);

    renderHook(
      () =>
        useOrders({
          accountId: 'acc-1',
          status: 'draft',
          sortBy: 'total',
          sortOrder: 'desc',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());

    const callPath = mockApiClient.mock.calls[0][0] as string;
    expect(callPath).toContain('accountId=acc-1');
    expect(callPath).toContain('status=draft');
    expect(callPath).toContain('sortBy=total');
    expect(callPath).toContain('sortOrder=desc');
  });

  test('FR-011: includes cursor for pagination', async () => {
    mockApiClient.mockResolvedValue(MOCK_ORDER_LIST);

    renderHook(() => useOrders({ cursor: 'cursor-xyz' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());

    const callPath = mockApiClient.mock.calls[0][0] as string;
    expect(callPath).toContain('cursor=cursor-xyz');
  });

  test('FR-011: handles error state', async () => {
    mockApiClient.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useOrders({}), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('FR-011: useOrder hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-011: fetches single order by ID', async () => {
    mockApiClient.mockResolvedValue(MOCK_ORDER_DETAIL);

    const { result } = renderHook(() => useOrder('ord-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data.orderNumber).toBe('ORD-20260226-0001');
    expect(result.current.data?.data.accountName).toBe('Pacific Foods');
  });

  test('FR-011: disabled when orderId is undefined', () => {
    const { result } = renderHook(() => useOrder(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('FR-011: useCreateOrder mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-011: creates order with POST request', async () => {
    mockApiClient.mockResolvedValue(MOCK_ORDER_DETAIL);

    const { result } = renderHook(() => useCreateOrder(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        accountId: 'acc-1',
        lineItems: [
          {
            productId: 'prod-1',
            quantity: 10,
            unitPrice: 12.0,
            revenueModel: 'broker',
          },
        ],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiClient).toHaveBeenCalledWith(
      '/api/orders',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('FR-011: useSubmitOrder mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-011: submits order with POST to submit endpoint', async () => {
    mockApiClient.mockResolvedValue(MOCK_ORDER_DETAIL);

    const { result } = renderHook(() => useSubmitOrder(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('ord-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiClient).toHaveBeenCalledWith(
      '/api/orders/ord-1/submit',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('FR-011: useCancelOrder mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-011: cancels order with POST to cancel endpoint', async () => {
    mockApiClient.mockResolvedValue(MOCK_ORDER_DETAIL);

    const { result } = renderHook(() => useCancelOrder(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('ord-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiClient).toHaveBeenCalledWith(
      '/api/orders/ord-1/cancel',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('FR-013: useApprovalQueue hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-013: fetches approval queue', async () => {
    const mockQueue = {
      data: [
        {
          id: 'ord-2',
          orderNumber: 'ORD-20260226-0002',
          accountId: 'acc-2',
          accountName: 'Mountain Bakery',
          repName: 'John Smith',
          status: 'pending_approval' as const,
          total: 6200.0,
          lineItemCount: 5,
          exportStatus: null,
          submittedAt: '2026-02-26T12:00:00Z',
          createdAt: '2026-02-26T11:00:00Z',
        },
      ],
      pagination: { cursor: null, hasMore: false, total: 1 },
    };

    mockApiClient.mockResolvedValue(mockQueue);

    const { result } = renderHook(() => useApprovalQueue({}), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].status).toBe('pending_approval');
    expect(result.current.data?.data[0].total).toBe(6200.0);
  });
});
