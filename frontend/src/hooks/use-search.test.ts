import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

import { useSearch } from '@/hooks/use-search';
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
}));

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe('T061: useSearch hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FR-002: returns empty data when query is less than 2 characters', () => {
    const { result } = renderHook(() => useSearch('a'), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('FR-002: does not fire query for empty string', () => {
    const { result } = renderHook(() => useSearch(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('FR-002: fetches search results when query is >= 2 characters', async () => {
    const mockResponse = {
      data: [
        { id: 'acc-1', name: 'Portland Provisions', city: 'Portland', account_type: 'Store' },
        { id: 'acc-2', name: 'Portland Produce', city: 'Portland', account_type: 'Restaurant' },
      ],
    };

    vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useSearch('portland'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[0]?.name).toBe('Portland Provisions');
    expect(apiClient.get).toHaveBeenCalledWith('/api/accounts/search?q=portland');
  });

  it('FR-002: encodes special characters in query', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

    const { result } = renderHook(() => useSearch('portland & co'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(apiClient.get).toHaveBeenCalledWith('/api/accounts/search?q=portland%20%26%20co');
  });

  it('FR-002: handles API errors gracefully', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSearch('portland'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.data).toEqual([]);
  });

  it('FR-002: trims whitespace from query before checking length', () => {
    const { result } = renderHook(() => useSearch('  '), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
