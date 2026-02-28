import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useTasks, useCreateTask, useUpdateTask } from './use-tasks';

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

const MOCK_TASKS = {
  data: [
    {
      id: 'task-1',
      tenantId: 'tenant-1',
      title: 'Follow up with Pacific Bistro',
      description: 'Check on sample order status',
      dueDate: '2026-03-01T10:00:00.000Z',
      priority: 'high',
      status: 'pending',
      assigneeId: 'user-1',
      creatorId: 'user-1',
      accountId: 'acc-1',
      contactId: null,
      completedAt: null,
      isOverdue: false,
      createdAt: '2026-02-26T10:00:00Z',
      updatedAt: '2026-02-26T10:00:00Z',
    },
  ],
  pagination: { cursor: null, hasMore: false, total: 1 },
};

describe('FR-037: useTasks hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-037: fetches tasks from GET /api/tasks', async () => {
    mockApiClient.mockResolvedValue(MOCK_TASKS);

    const { result } = renderHook(
      () => useTasks({}),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].title).toBe('Follow up with Pacific Bistro');
  });

  test('FR-037: passes status filter as query param', async () => {
    mockApiClient.mockResolvedValue(MOCK_TASKS);

    renderHook(
      () => useTasks({ status: 'pending' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());

    const callPath = mockApiClient.mock.calls[0][0] as string;
    expect(callPath).toContain('status=pending');
  });

  test('FR-037: passes priority filter as query param', async () => {
    mockApiClient.mockResolvedValue(MOCK_TASKS);

    renderHook(
      () => useTasks({ priority: 'high' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());

    const callPath = mockApiClient.mock.calls[0][0] as string;
    expect(callPath).toContain('priority=high');
  });

  test('FR-037: passes overdue filter as query param', async () => {
    mockApiClient.mockResolvedValue(MOCK_TASKS);

    renderHook(
      () => useTasks({ overdue: 'true' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());

    const callPath = mockApiClient.mock.calls[0][0] as string;
    expect(callPath).toContain('overdue=true');
  });

  test('FR-037: handles error state', async () => {
    mockApiClient.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(
      () => useTasks({}),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  test('FR-037: passes cursor for pagination', async () => {
    mockApiClient.mockResolvedValue(MOCK_TASKS);

    renderHook(
      () => useTasks({ cursor: 'abc-123' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());

    const callPath = mockApiClient.mock.calls[0][0] as string;
    expect(callPath).toContain('cursor=abc-123');
  });
});

describe('FR-037: useCreateTask hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-037: creates task via POST /api/tasks', async () => {
    mockApiClient.mockResolvedValue({
      data: { id: 'new-task', title: 'New task', status: 'pending' },
    });

    const { result } = renderHook(
      () => useCreateTask(),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await result.current.mutateAsync({
        title: 'New task',
        dueDate: '2026-03-01T10:00:00.000Z',
        priority: 'high',
        assigneeId: 'user-1',
      });
    });

    expect(mockApiClient).toHaveBeenCalledWith(
      '/api/tasks',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('FR-037: useUpdateTask hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-037: updates task via PUT /api/tasks/:id', async () => {
    mockApiClient.mockResolvedValue({
      data: { id: 'task-1', title: 'Updated', status: 'completed' },
    });

    const { result } = renderHook(
      () => useUpdateTask(),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await result.current.mutateAsync({
        id: 'task-1',
        data: { status: 'completed' },
      });
    });

    expect(mockApiClient).toHaveBeenCalledWith(
      '/api/tasks/task-1',
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});
