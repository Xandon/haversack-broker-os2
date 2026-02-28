import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProducts, useProduct } from './use-products';

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from '@/lib/api-client';

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('FR-041: useProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-041: fetches products list', async () => {
    const mockResponse = {
      data: [{ id: 'p-1', name: 'Artisan Honey', sku: 'HON-001' }],
      pagination: { cursor: null, hasMore: false, total: 1 },
    };
    vi.mocked(apiClient).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useProducts({}), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].name).toBe('Artisan Honey');
  });

  test('FR-041: passes filter params as query string', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({ data: [], pagination: { cursor: null, hasMore: false, total: 0 } });

    renderHook(() => useProducts({ brandId: 'b-1', category: 'honey', availabilityStatus: 'active' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(vi.mocked(apiClient)).toHaveBeenCalledWith(
        expect.stringContaining('brandId=b-1'),
      );
    });
  });

  test('FR-041: handles empty results', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({ data: [], pagination: { cursor: null, hasMore: false, total: 0 } });

    const { result } = renderHook(() => useProducts({}), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(0);
  });
});

describe('FR-041: useProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-041: fetches product detail by id', async () => {
    const mockResponse = {
      data: { id: 'p-1', name: 'Artisan Honey', sku: 'HON-001', unitPrice: 12.99 },
    };
    vi.mocked(apiClient).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useProduct('p-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.name).toBe('Artisan Honey');
  });

  test('FR-041: does not fetch when productId is undefined', () => {
    const { result } = renderHook(() => useProduct(undefined), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(false);
    expect(vi.mocked(apiClient)).not.toHaveBeenCalled();
  });
});
