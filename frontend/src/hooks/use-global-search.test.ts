import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createElement } from 'react';

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

vi.mock('@/hooks/use-debounce', () => ({
  useDebounce: (value: string, _delay: number) => value,
}));

import { useGlobalSearch } from './use-global-search';

function createWrapper(): ({ children }: { children: ReactNode }) => React.ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): React.ReactElement {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('FR-032: useGlobalSearch hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FR-032: does not fetch when query is less than 2 characters', async () => {
    const { apiClient } = await import('@/lib/api-client');

    const { result } = renderHook(() => useGlobalSearch('a'), {
      wrapper: createWrapper(),
    });

    // Should not make any API calls
    expect(apiClient).not.toHaveBeenCalled();
    expect(result.current.accounts).toEqual([]);
    expect(result.current.contacts).toEqual([]);
    expect(result.current.products).toEqual([]);
  });

  it('FR-032: fetches accounts, contacts, and products in parallel', async () => {
    const { apiClient } = await import('@/lib/api-client');
    const mockApiClient = apiClient as ReturnType<typeof vi.fn>;

    mockApiClient.mockImplementation((url: string) => {
      if (url.includes('/api/accounts')) {
        return Promise.resolve({
          data: [
            { id: 'acc-1', name: 'Pacific Foods', territory: { name: 'Portland Metro' } },
          ],
        });
      }
      if (url.includes('/api/contacts')) {
        return Promise.resolve({
          data: [
            { id: 'con-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@pacific.com', phone: null, accountId: 'acc-1', accountName: 'Pacific Foods' },
          ],
        });
      }
      if (url.includes('/api/products')) {
        return Promise.resolve({
          data: [
            { id: 'prod-1', name: 'Sourdough Bread', sku: 'SDB-001' },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useGlobalSearch('pacific'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].type).toBe('account');
    expect(result.current.accounts[0].name).toBe('Pacific Foods');
    expect(result.current.accounts[0].secondaryText).toBe('Portland Metro');
    expect(result.current.accounts[0].url).toBe('/accounts/acc-1');

    expect(result.current.contacts).toHaveLength(1);
    expect(result.current.contacts[0].type).toBe('contact');
    expect(result.current.contacts[0].name).toBe('Jane Doe');
    expect(result.current.contacts[0].secondaryText).toBe('jane@pacific.com');
    expect(result.current.contacts[0].url).toBe('/accounts/acc-1?tab=contacts');

    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].type).toBe('product');
    expect(result.current.products[0].name).toBe('Sourdough Bread');
    expect(result.current.products[0].secondaryText).toBe('SDB-001');
    expect(result.current.products[0].url).toBe('/products/prod-1');
  });

  it('FR-032: maps contact with null email to use phone as secondary text', async () => {
    const { apiClient } = await import('@/lib/api-client');
    const mockApiClient = apiClient as ReturnType<typeof vi.fn>;

    mockApiClient.mockImplementation((url: string) => {
      if (url.includes('/api/contacts')) {
        return Promise.resolve({
          data: [
            { id: 'con-2', firstName: 'Bob', lastName: 'Smith', email: null, phone: '503-555-0123', accountId: 'acc-2', accountName: 'Mountain Provisions' },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useGlobalSearch('bob'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.contacts[0].secondaryText).toBe('503-555-0123');
  });

  it('FR-032: returns empty arrays when no results found', async () => {
    const { apiClient } = await import('@/lib/api-client');
    const mockApiClient = apiClient as ReturnType<typeof vi.fn>;

    mockApiClient.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useGlobalSearch('nonexistent'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.accounts).toEqual([]);
    expect(result.current.contacts).toEqual([]);
    expect(result.current.products).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it('FR-032: sets isError when all queries fail', async () => {
    const { apiClient } = await import('@/lib/api-client');
    const mockApiClient = apiClient as ReturnType<typeof vi.fn>;

    mockApiClient.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useGlobalSearch('test'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('FR-032: encodes query for URL safety', async () => {
    const { apiClient } = await import('@/lib/api-client');
    const mockApiClient = apiClient as ReturnType<typeof vi.fn>;

    mockApiClient.mockResolvedValue({ data: [] });

    renderHook(() => useGlobalSearch('pacific & sons'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledWith(
        expect.stringContaining('pacific%20%26%20sons'),
      );
    });
  });

  it('FR-032: exposes refetch function', async () => {
    const { apiClient } = await import('@/lib/api-client');
    const mockApiClient = apiClient as ReturnType<typeof vi.fn>;
    mockApiClient.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useGlobalSearch('test'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.refetch).toBe('function');
  });

  it('FR-032: sets tertiaryText for contact results with account name', async () => {
    const { apiClient } = await import('@/lib/api-client');
    const mockApiClient = apiClient as ReturnType<typeof vi.fn>;

    mockApiClient.mockImplementation((url: string) => {
      if (url.includes('/api/contacts')) {
        return Promise.resolve({
          data: [
            { id: 'con-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@test.com', phone: null, accountId: 'acc-1', accountName: 'Pacific Foods' },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useGlobalSearch('jane'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.contacts[0].tertiaryText).toBe('Pacific Foods');
  });

  it('FR-032: isError false when only some queries fail (partial error)', async () => {
    const { apiClient } = await import('@/lib/api-client');
    const mockApiClient = apiClient as ReturnType<typeof vi.fn>;

    mockApiClient.mockImplementation((url: string) => {
      if (url.includes('/api/accounts')) {
        return Promise.resolve({
          data: [{ id: 'acc-1', name: 'Pacific Foods', territory: { name: 'Portland' } }],
        });
      }
      return Promise.reject(new Error('Network error'));
    });

    const { result } = renderHook(() => useGlobalSearch('pacific'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(false);
    expect(result.current.accounts).toHaveLength(1);
  });
});
