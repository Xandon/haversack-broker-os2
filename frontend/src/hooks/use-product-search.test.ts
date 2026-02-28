import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useProductSearch, searchProducts } from './use-product-search';

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

const MOCK_PRODUCTS = {
  data: [
    {
      id: 'prod-1',
      name: 'Artisan Honey 12oz',
      sku: 'AH-12',
      brand: { id: 'brand-1', name: 'Pacific Honey Co' },
      unitPrice: 10.0,
      wholesalePrice: 7.5,
      promotionalPrice: 8.5,
      promotionalPriceStart: '2026-01-01T00:00:00Z',
      promotionalPriceEnd: '2026-04-01T00:00:00Z',
      caseSize: 24,
      revenueModelDefault: 'broker' as const,
      commissionRate: 12.0,
      availabilityStatus: 'active' as const,
      category: null,
      subcategory: null,
      description: null,
      imageUrl: null,
      certifications: [],
      allergens: [],
      dietaryAttributes: [],
    },
  ],
};

describe('FR-012: useProductSearch hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-012: searches products with query', async () => {
    mockApiClient.mockResolvedValue(MOCK_PRODUCTS);

    const { result } = renderHook(
      () => useProductSearch({ q: 'honey' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].name).toBe('Artisan Honey 12oz');
  });

  test('FR-012: disabled when query is less than 2 characters', () => {
    const { result } = renderHook(
      () => useProductSearch({ q: 'h' }),
      { wrapper: createWrapper() },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockApiClient).not.toHaveBeenCalled();
  });

  test('FR-012: builds correct query string', async () => {
    mockApiClient.mockResolvedValue(MOCK_PRODUCTS);

    renderHook(
      () => useProductSearch({ q: 'honey', brandId: 'brand-1', limit: 10 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());

    const callPath = mockApiClient.mock.calls[0][0] as string;
    expect(callPath).toContain('q=honey');
    expect(callPath).toContain('brandId=brand-1');
    expect(callPath).toContain('limit=10');
  });

  test('FR-012: handles error state', async () => {
    mockApiClient.mockRejectedValue(new Error('Search failed'));

    const { result } = renderHook(
      () => useProductSearch({ q: 'honey' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('FR-012: searchProducts function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-012: returns empty array for short queries', async () => {
    const result = await searchProducts('h');
    expect(result).toEqual([]);
    expect(mockApiClient).not.toHaveBeenCalled();
  });

  test('FR-012: calls API and returns products', async () => {
    mockApiClient.mockResolvedValue(MOCK_PRODUCTS);

    const result = await searchProducts('honey');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Artisan Honey 12oz');
  });
});
