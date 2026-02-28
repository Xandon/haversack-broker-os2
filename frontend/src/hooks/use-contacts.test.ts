import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useCreateContact, useUpdateContact, useDeleteContact } from './use-contacts';

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

const MOCK_CONTACT = {
  data: {
    id: 'con-1',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    phone: '503-555-0100',
    title: 'Manager',
    isPrimary: true,
    createdAt: '2026-02-27T10:00:00Z',
    updatedAt: '2026-02-27T10:00:00Z',
  },
};

describe('FR-002: useCreateContact mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-002: creates contact with POST to account contacts endpoint', async () => {
    mockApiClient.mockResolvedValue(MOCK_CONTACT);

    const { result } = renderHook(() => useCreateContact(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        accountId: 'acc-1',
        input: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          isPrimary: true,
        },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiClient).toHaveBeenCalledWith(
      '/api/accounts/acc-1/contacts',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('FR-002: useUpdateContact mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-002: updates contact with PUT request', async () => {
    mockApiClient.mockResolvedValue(MOCK_CONTACT);

    const { result } = renderHook(() => useUpdateContact(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        accountId: 'acc-1',
        contactId: 'con-1',
        input: { firstName: 'Janet' },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiClient).toHaveBeenCalledWith(
      '/api/accounts/acc-1/contacts/con-1',
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});

describe('FR-002: useDeleteContact mutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-002: deletes contact with DELETE request', async () => {
    mockApiClient.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteContact(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ accountId: 'acc-1', contactId: 'con-1' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiClient).toHaveBeenCalledWith(
      '/api/accounts/acc-1/contacts/con-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
