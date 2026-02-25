import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

import { useActivities, useActivity, useCreateActivity } from '@/hooks/use-activities';
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

describe('T070: useActivities hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useActivities', () => {
    it('FR-008: fetches activity list with infinite scroll pagination', async () => {
      const mockResponse = {
        data: [
          {
            id: 'act-1',
            account_id: 'acc-1',
            user_id: 'user-1',
            user_name: 'Jane Smith',
            activity_type: 'visit',
            subject: 'Store visit',
            notes: 'Good meeting',
            duration_minutes: 30,
            activity_date: '2026-02-25',
            created_at: '2026-02-25T10:00:00Z',
            updated_at: '2026-02-25T10:00:00Z',
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1, hasNextPage: false },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useActivities('acc-1'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activities).toHaveLength(1);
      expect(result.current.activities[0]?.subject).toBe('Store visit');
      expect(result.current.hasNextPage).toBe(false);
      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/accounts/acc-1/activities?page=1&limit=20',
      );
    });

    it('FR-008: returns empty array when no activities exist', async () => {
      const mockResponse = {
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useActivities('acc-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activities).toEqual([]);
    });

    it('FR-008: handles API errors gracefully', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useActivities('acc-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Network error');
    });

    it('FR-008: does not fetch when accountId is empty', () => {
      renderHook(() => useActivities(''), {
        wrapper: createWrapper(),
      });

      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('useActivity', () => {
    it('FR-008: fetches a single activity by ID', async () => {
      const mockResponse = {
        data: {
          id: 'act-123',
          account_id: 'acc-1',
          user_id: 'user-1',
          user_name: 'Jane Smith',
          activity_type: 'call',
          subject: 'Follow-up call',
          notes: null,
          duration_minutes: 15,
          activity_date: '2026-02-25',
          created_at: '2026-02-25T14:00:00Z',
          updated_at: '2026-02-25T14:00:00Z',
        },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useActivity('act-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activity?.subject).toBe('Follow-up call');
      expect(apiClient.get).toHaveBeenCalledWith('/api/activities/act-123');
    });
  });

  describe('useCreateActivity', () => {
    it('FR-008: creates an activity via POST', async () => {
      const mockResponse = {
        data: {
          id: 'new-act-1',
          account_id: 'acc-1',
          activity_type: 'visit',
          subject: 'New visit',
          created_at: '2026-02-25T10:00:00Z',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCreateActivity(), {
        wrapper: createWrapper(),
      });

      result.current.createActivity({
        account_id: 'acc-1',
        activity_type: 'visit',
        subject: 'New visit',
        activity_date: '2026-02-25',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/activities',
        expect.objectContaining({
          account_id: 'acc-1',
          activity_type: 'visit',
          subject: 'New visit',
        }),
      );
    });
  });
});
