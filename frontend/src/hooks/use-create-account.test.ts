import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useCreateAccount } from './use-create-account';

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

const MOCK_CREATE_INPUT = {
  name: 'Acme Foods',
  accountType: 'retail' as const,
  streetAddress: '123 Main St',
  city: 'Portland',
  state: 'OR',
  zipCode: '97201',
  territoryId: 'ter-1',
  primaryContact: {
    firstName: 'John',
    lastName: 'Doe',
  },
  skipDuplicateCheck: false,
};

const MOCK_RESPONSE = {
  data: {
    id: 'acc-new-1',
    name: 'Acme Foods',
    accountType: 'retail',
    streetAddress: '123 Main St',
    city: 'Portland',
    state: 'OR',
    zipCode: '97201',
    territoryId: 'ter-1',
    parentAccountId: null,
    isActive: true,
    createdAt: '2026-02-28T10:00:00Z',
    updatedAt: '2026-02-28T10:00:00Z',
  },
};

describe('FR-035: useCreateAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-035a: calls POST /api/accounts with input', async () => {
    mockApiClient.mockResolvedValueOnce(MOCK_RESPONSE);

    const { result } = renderHook(() => useCreateAccount(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(MOCK_CREATE_INPUT);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiClient).toHaveBeenCalledWith('/api/accounts', {
      method: 'POST',
      body: JSON.stringify(MOCK_CREATE_INPUT),
    });
    expect(result.current.data).toEqual(MOCK_RESPONSE);
  });

  test('FR-035a: returns error on API failure', async () => {
    mockApiClient.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useCreateAccount(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(MOCK_CREATE_INPUT);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network error');
  });

  test('FR-035a: is idle before mutation is triggered', () => {
    const { result } = renderHook(() => useCreateAccount(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isIdle).toBe(true);
    expect(result.current.data).toBeUndefined();
  });
});
