import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useActivities, useCreateActivity } from './use-activities';

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

const MOCK_ACTIVITIES = {
  data: [
    {
      id: 'act-1',
      tenantId: 'tenant-1',
      accountId: 'acc-1',
      userId: 'user-1',
      type: 'visit',
      notes: 'Met with purchasing team',
      occurredAt: '2026-02-26T14:00:00Z',
      durationMinutes: 45,
      version: 1,
      demos: [],
      createdAt: '2026-02-26T14:00:00Z',
      updatedAt: '2026-02-26T14:00:00Z',
    },
  ],
  pagination: { cursor: null, hasMore: false, total: 1 },
};

describe('FR-036: useActivities hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-036: fetches activities for an account', async () => {
    mockApiClient.mockResolvedValue(MOCK_ACTIVITIES);

    const { result } = renderHook(
      () => useActivities({ accountId: 'acc-1' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].type).toBe('visit');
    expect(result.current.data?.data[0].notes).toBe('Met with purchasing team');
  });

  test('FR-036: includes accountId in API path', async () => {
    mockApiClient.mockResolvedValue(MOCK_ACTIVITIES);

    renderHook(
      () => useActivities({ accountId: 'acc-1' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());

    const callPath = mockApiClient.mock.calls[0][0] as string;
    expect(callPath).toContain('/api/accounts/acc-1/activities');
  });

  test('FR-036: passes type filter as query param', async () => {
    mockApiClient.mockResolvedValue(MOCK_ACTIVITIES);

    renderHook(
      () => useActivities({ accountId: 'acc-1', type: 'demo' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());

    const callPath = mockApiClient.mock.calls[0][0] as string;
    expect(callPath).toContain('type=demo');
  });

  test('FR-036: disabled when accountId is empty', async () => {
    mockApiClient.mockResolvedValue(MOCK_ACTIVITIES);

    const { result } = renderHook(
      () => useActivities({ accountId: '' }),
      { wrapper: createWrapper() },
    );

    // Should not fetch
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockApiClient).not.toHaveBeenCalled();
  });

  test('FR-036: handles error state', async () => {
    mockApiClient.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(
      () => useActivities({ accountId: 'acc-1' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('FR-036: useCreateActivity hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-036: creates activity via POST /api/activities', async () => {
    mockApiClient.mockResolvedValue({
      data: { id: 'new-act', type: 'visit', accountId: 'acc-1' },
    });

    const { result } = renderHook(
      () => useCreateActivity(),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await result.current.mutateAsync({
        accountId: 'acc-1',
        type: 'visit',
        occurredAt: '2026-02-28T10:00:00Z',
        notes: 'Quick visit',
      });
    });

    expect(mockApiClient).toHaveBeenCalledWith(
      '/api/activities',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });
});
