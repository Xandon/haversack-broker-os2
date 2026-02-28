import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useAccountActivities } from './use-account-activities';

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

const MOCK_TIMELINE = {
  data: [
    {
      id: 'act-1',
      type: 'activity' as const,
      occurredAt: '2026-02-26T14:00:00Z',
      data: {
        type: 'visit',
        notes: 'Met with purchasing team',
        durationMinutes: 45,
        user: { id: 'user-1', firstName: 'Jane', lastName: 'Doe' },
      },
    },
    {
      id: 'email-1',
      type: 'email' as const,
      occurredAt: '2026-02-25T10:00:00Z',
      data: {
        subject: 'Follow up on product samples',
        direction: 'outbound',
        status: 'sent',
        user: { id: 'user-1', firstName: 'Jane', lastName: 'Doe' },
      },
    },
  ],
  pagination: { cursor: null, hasMore: false, total: 2 },
  counts: { activity: 1, email: 1, task: 0 },
};

describe('FR-002: useAccountActivities hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-002: fetches timeline for account', async () => {
    mockApiClient.mockResolvedValue(MOCK_TIMELINE);

    const { result } = renderHook(
      () => useAccountActivities({ accountId: 'acc-1' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const items = result.current.data?.pages[0]?.data;
    expect(items).toHaveLength(2);
    expect(items?.[0].type).toBe('activity');
    expect(items?.[1].type).toBe('email');
  });

  test('FR-002: calls correct API path with account ID', async () => {
    mockApiClient.mockResolvedValue(MOCK_TIMELINE);

    renderHook(
      () => useAccountActivities({ accountId: 'acc-1' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());

    const callPath = mockApiClient.mock.calls[0][0] as string;
    expect(callPath).toContain('/api/accounts/acc-1/timeline');
  });

  test('FR-002: includes activityType filter when specified', async () => {
    mockApiClient.mockResolvedValue(MOCK_TIMELINE);

    renderHook(
      () => useAccountActivities({ accountId: 'acc-1', activityType: 'visit' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());

    const callPath = mockApiClient.mock.calls[0][0] as string;
    expect(callPath).toContain('activityType=visit');
  });

  test('FR-002: includes limit parameter', async () => {
    mockApiClient.mockResolvedValue(MOCK_TIMELINE);

    renderHook(
      () => useAccountActivities({ accountId: 'acc-1', limit: 10 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());

    const callPath = mockApiClient.mock.calls[0][0] as string;
    expect(callPath).toContain('limit=10');
  });

  test('FR-002: handles error state', async () => {
    mockApiClient.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(
      () => useAccountActivities({ accountId: 'acc-1' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
