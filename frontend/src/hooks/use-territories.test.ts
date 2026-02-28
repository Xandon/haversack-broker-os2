import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useTerritories } from './use-territories';

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

describe('FR-033c: useTerritories hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-033c: fetches territories', async () => {
    const mockTerritories = [
      { id: 'ter-1', name: 'Portland Metro', region: 'Oregon' },
      { id: 'ter-2', name: 'Seattle Area', region: 'Washington' },
    ];

    mockApiClient.mockResolvedValue({ data: mockTerritories });

    const { result } = renderHook(() => useTerritories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].name).toBe('Portland Metro');
  });

  test('FR-033c: calls correct API endpoint', async () => {
    mockApiClient.mockResolvedValue({ data: [] });

    renderHook(() => useTerritories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());

    expect(mockApiClient).toHaveBeenCalledWith('/api/territories');
  });

  test('FR-033c: handles error state', async () => {
    mockApiClient.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTerritories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
