import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { OrdersTab } from './orders-tab';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

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
    {
      id: 'ord-2',
      orderNumber: 'ORD-20260220-0002',
      accountId: 'acc-1',
      accountName: 'Pacific Bistro',
      repName: 'Jane Doe',
      status: 'draft',
      total: 580.0,
      lineItemCount: 2,
      exportStatus: null,
      submittedAt: null,
      createdAt: '2026-02-20T09:00:00Z',
    },
  ],
  pagination: { cursor: null, hasMore: false, total: 2 },
};

describe('FR-002: OrdersTab component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-002: renders order table with data', async () => {
    mockApiClient.mockResolvedValue(MOCK_ORDERS);

    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(OrdersTab, { accountId: 'acc-1' }),
      ),
    );

    const orderNumber = await screen.findByText('ORD-20260226-0001');
    expect(orderNumber).toBeDefined();
    expect(screen.getByText('ORD-20260220-0002')).toBeDefined();
  });

  test('FR-002: renders order count', async () => {
    mockApiClient.mockResolvedValue(MOCK_ORDERS);

    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(OrdersTab, { accountId: 'acc-1' }),
      ),
    );

    const count = await screen.findByText('Showing 2 of 2 orders');
    expect(count).toBeDefined();
  });

  test('FR-002: renders status badges', async () => {
    mockApiClient.mockResolvedValue(MOCK_ORDERS);

    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(OrdersTab, { accountId: 'acc-1' }),
      ),
    );

    await screen.findByText('ORD-20260226-0001');
    expect(screen.getByText('Confirmed')).toBeDefined();
    expect(screen.getByText('Draft')).toBeDefined();
  });

  test('FR-002: renders table headers', async () => {
    mockApiClient.mockResolvedValue(MOCK_ORDERS);

    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(OrdersTab, { accountId: 'acc-1' }),
      ),
    );

    await screen.findByText('ORD-20260226-0001');
    expect(screen.getByText('Order #')).toBeDefined();
    expect(screen.getByText('Date')).toBeDefined();
    expect(screen.getByText('Status')).toBeDefined();
    expect(screen.getByText('Total')).toBeDefined();
    expect(screen.getByText('Items')).toBeDefined();
  });

  test('FR-002: shows empty state when no orders', async () => {
    mockApiClient.mockResolvedValue({
      data: [],
      pagination: { cursor: null, hasMore: false, total: 0 },
    });

    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(OrdersTab, { accountId: 'acc-1' }),
      ),
    );

    const emptyState = await screen.findByText('No orders yet');
    expect(emptyState).toBeDefined();
  });

  test('FR-002: shows New Order button', async () => {
    mockApiClient.mockResolvedValue(MOCK_ORDERS);

    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(OrdersTab, { accountId: 'acc-1' }),
      ),
    );

    await screen.findByText('ORD-20260226-0001');
    expect(screen.getByText('New Order')).toBeDefined();
  });
});
