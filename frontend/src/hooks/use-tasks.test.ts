import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

import {
  useTasks,
  useTask,
  useCreateTask,
  useUpdateTask,
  useCompleteTask,
} from '@/hooks/use-tasks';
import { apiClient } from '@/lib/api-client';

// -------------------------------------------------------------------
// Mocks
// -------------------------------------------------------------------

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    public status: number;
    public code: string;
    public requestId: string;
    constructor(status: number, body: { message: string; code: string; requestId: string }) {
      super(body.message);
      this.status = status;
      this.code = body.code;
      this.requestId = body.requestId;
    }
  },
}));

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function createWrapper(): ({ children }: { children: ReactNode }) => React.JSX.Element {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }): React.JSX.Element {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe('useTasks hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useTasks', () => {
    it('FR-009: fetches task list with filters', async () => {
      const mockResponse = {
        data: [
          {
            id: 'task-1',
            title: 'Follow up with Portland Provisions',
            description: null,
            status: 'pending',
            priority: 'high',
            due_date: '2026-03-01',
            assigned_to: 'user-1',
            assigned_to_name: 'Jane Smith',
            account_id: null,
            contact_id: null,
            created_by: 'user-1',
            tenant_id: 'tenant-1',
            created_at: '2026-02-25T10:00:00Z',
            updated_at: '2026-02-25T10:00:00Z',
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(
        () => useTasks({ status: 'pending', sort_by: 'due_date' }),
        { wrapper: createWrapper() },
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0]?.title).toBe('Follow up with Portland Provisions');
      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/tasks?status=pending&sort_by=due_date',
      );
    });

    it('FR-009: returns empty array when no tasks exist', async () => {
      const mockResponse = {
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tasks).toEqual([]);
    });

    it('FR-009: handles API errors gracefully', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Server error'));

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Server error');
    });
  });

  describe('useTask', () => {
    it('FR-009: fetches a single task by ID', async () => {
      const mockResponse = {
        data: {
          id: 'task-123',
          title: 'Check inventory',
          status: 'pending',
          priority: 'medium',
          due_date: '2026-03-15',
          assigned_to: 'user-1',
          assigned_to_name: 'Jane Smith',
        },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useTask('task-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.task?.title).toBe('Check inventory');
      expect(apiClient.get).toHaveBeenCalledWith('/api/tasks/task-123');
    });
  });

  describe('useCreateTask', () => {
    it('FR-009: creates a task via POST', async () => {
      const mockResponse = {
        data: {
          id: 'new-task-1',
          title: 'Send samples',
          status: 'pending',
          priority: 'high',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCreateTask(), {
        wrapper: createWrapper(),
      });

      result.current.createTask({
        title: 'Send samples',
        due_date: '2026-03-01',
        priority: 'high',
        assigned_to: 'user-1',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/tasks',
        expect.objectContaining({
          title: 'Send samples',
          priority: 'high',
        }),
      );
    });
  });

  describe('useUpdateTask', () => {
    it('FR-009: updates a task via PATCH', async () => {
      const mockResponse = {
        data: { id: 'task-1', title: 'Updated title', status: 'in_progress' },
      };

      vi.mocked(apiClient.patch).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useUpdateTask(), {
        wrapper: createWrapper(),
      });

      result.current.updateTask({
        id: 'task-1',
        payload: { title: 'Updated title', status: 'in_progress' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.patch).toHaveBeenCalledWith('/api/tasks/task-1', {
        title: 'Updated title',
        status: 'in_progress',
      });
    });
  });

  describe('useCompleteTask', () => {
    it('FR-009: completes a task by setting status to completed', async () => {
      const mockResponse = {
        data: { id: 'task-1', status: 'completed' },
      };

      vi.mocked(apiClient.patch).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCompleteTask(), {
        wrapper: createWrapper(),
      });

      result.current.completeTask('task-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.patch).toHaveBeenCalledWith('/api/tasks/task-1', {
        status: 'completed',
      });
    });
  });
});
