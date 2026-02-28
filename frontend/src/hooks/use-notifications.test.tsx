import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { useNotifications, useUnreadCount, useMarkNotificationRead, useMarkAllRead } from './use-notifications';

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from '@/lib/api-client';

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('FR-052: useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-052: fetches notifications list', async () => {
    const mockResponse = {
      data: [
        { id: 'n-1', type: 'task_reminder', title: 'Task due', body: null, isRead: false, createdAt: '2026-02-28T00:00:00Z' },
      ],
      pagination: { page: 1, perPage: 20, totalCount: 1 },
      unreadCount: 1,
    };
    vi.mocked(apiClient).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useNotifications(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient).toHaveBeenCalledWith('/api/notifications');
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.unreadCount).toBe(1);
  });
});

describe('FR-052: useUnreadCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-052: fetches unread count', async () => {
    vi.mocked(apiClient).mockResolvedValue({
      data: [],
      pagination: { page: 1, perPage: 1, totalCount: 0 },
      unreadCount: 3,
    });

    const { result } = renderHook(() => useUnreadCount(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.unreadCount).toBe(3);
  });
});

describe('FR-052: useMarkNotificationRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-052: marks notification as read', async () => {
    const mockResponse = { data: { id: 'n-1', isRead: true, readAt: '2026-02-28T12:00:00Z' } };
    vi.mocked(apiClient).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper: createWrapper() });

    result.current.mutate('n-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient).toHaveBeenCalledWith('/api/notifications/n-1/read', { method: 'PATCH' });
  });
});

describe('FR-052: useMarkAllRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-052: marks all notifications as read', async () => {
    const mockResponse = { data: { markedCount: 3 } };
    vi.mocked(apiClient).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useMarkAllRead(), { wrapper: createWrapper() });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient).toHaveBeenCalledWith('/api/notifications/read-all', { method: 'POST' });
  });
});
