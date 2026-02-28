import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useCheckDuplicates } from './use-check-duplicates';

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

const MOCK_DUPLICATE_RESPONSE = {
  data: {
    hasDuplicates: true,
    matches: [
      {
        id: 'acc-existing-1',
        name: 'Acme Food Co',
        accountType: 'retail',
        territory: { id: 'ter-1', name: 'Portland Metro' },
        confidence: 90,
        matchType: 'name',
      },
    ],
  },
};

const MOCK_NO_DUPLICATES = {
  data: {
    hasDuplicates: false,
    matches: [],
  },
};

describe('FR-035c: useCheckDuplicates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-035c: calls check-duplicates API with name param', async () => {
    mockApiClient.mockResolvedValueOnce(MOCK_DUPLICATE_RESPONSE);

    const { result } = renderHook(() => useCheckDuplicates(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('Acme Foods');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiClient).toHaveBeenCalledWith(
      '/api/accounts/check-duplicates?name=Acme+Foods',
    );
    expect(result.current.data?.data.hasDuplicates).toBe(true);
    expect(result.current.data?.data.matches).toHaveLength(1);
  });

  test('FR-035c: returns no duplicates when none found', async () => {
    mockApiClient.mockResolvedValueOnce(MOCK_NO_DUPLICATES);

    const { result } = renderHook(() => useCheckDuplicates(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('Unique Name');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.hasDuplicates).toBe(false);
    expect(result.current.data?.data.matches).toHaveLength(0);
  });

  test('FR-035c: is idle before triggered', () => {
    const { result } = renderHook(() => useCheckDuplicates(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isIdle).toBe(true);
  });

  test('FR-035c: handles API error', async () => {
    mockApiClient.mockRejectedValueOnce(new Error('Server error'));

    const { result } = renderHook(() => useCheckDuplicates(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate('Test');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Server error');
  });
});
