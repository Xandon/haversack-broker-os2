/**
 * Tests for use-products hooks.
 * Verifies FR-019 (product catalog) and FR-020 (line cards) at the hook layer.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import {
  PRODUCT_CATALOG_KEYS,
  useProductList,
  useProduct,
  useCreateProduct,
  useGenerateLineCard,
  useLineCards,
} from './use-products';

// -------------------------------------------------------------------
// Mock API client
// -------------------------------------------------------------------

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}));

// -------------------------------------------------------------------
// Mock TanStack Query
// -------------------------------------------------------------------

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe('T120: use-products hooks', () => {
  it('FR-019: PRODUCT_CATALOG_KEYS generates correct key hierarchy', () => {
    expect(PRODUCT_CATALOG_KEYS.all).toEqual(['products-catalog']);
    expect(PRODUCT_CATALOG_KEYS.lists()).toEqual(['products-catalog', 'list']);
    expect(PRODUCT_CATALOG_KEYS.detail('p1')).toEqual(['products-catalog', 'detail', 'p1']);
    expect(PRODUCT_CATALOG_KEYS.lineCardsByBrand('b1')).toEqual(['products-catalog', 'line-cards', 'b1']);
  });

  it('FR-019: useProductList calls useQuery with correct key and returns products', () => {
    const mockProducts = [
      { id: 'p1', name: 'Honey', sku: 'H-001' },
      { id: 'p2', name: 'Sauce', sku: 'S-001' },
    ];

    mockUseQuery.mockReturnValue({
      data: {
        data: mockProducts,
        pagination: { page: 1, per_page: 25, total_count: 2, total_pages: 1 },
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    const { result } = renderHook(() => useProductList({ page: 1 }));

    expect(result.current.products).toHaveLength(2);
    expect(result.current.products[0]!.name).toBe('Honey');
    expect(result.current.pagination?.total_count).toBe(2);
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: PRODUCT_CATALOG_KEYS.list({ page: 1 }),
      }),
    );
  });

  it('FR-019: useProduct calls useQuery with product ID', () => {
    mockUseQuery.mockReturnValue({
      data: { data: { id: 'p1', name: 'Honey', certifications: ['Organic'] } },
      isLoading: false,
      isError: false,
      error: null,
    });

    const { result } = renderHook(() => useProduct('p1'));

    expect(result.current.product).toBeTruthy();
    expect(result.current.product!.name).toBe('Honey');
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: PRODUCT_CATALOG_KEYS.detail('p1'),
      }),
    );
  });

  it('FR-019: useCreateProduct calls useMutation for product creation', () => {
    const mockMutate = vi.fn();
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
    });

    const { result } = renderHook(() => useCreateProduct());

    expect(result.current.createProduct).toBe(mockMutate);
    expect(result.current.isLoading).toBe(false);
    expect(mockUseMutation).toHaveBeenCalled();
  });

  it('FR-020: useGenerateLineCard calls useMutation for line card generation', () => {
    const mockMutate = vi.fn();
    mockUseMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
      data: undefined,
    });

    const { result } = renderHook(() => useGenerateLineCard());

    expect(result.current.generateLineCard).toBe(mockMutate);
    expect(result.current.isLoading).toBe(false);
  });

  it('FR-020: useLineCards calls useQuery with brand ID', () => {
    mockUseQuery.mockReturnValue({
      data: {
        data: [{ id: 'lc1', brand_id: 'b1', product_count: 5 }],
        pagination: { page: 1, per_page: 25, total_count: 1, total_pages: 1 },
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    const { result } = renderHook(() => useLineCards('b1'));

    expect(result.current.lineCards).toHaveLength(1);
    expect(result.current.lineCards[0]!.product_count).toBe(5);
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: PRODUCT_CATALOG_KEYS.lineCardsByBrand('b1'),
      }),
    );
  });

  it('FR-019: useProductList returns empty array when no data', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });

    const { result } = renderHook(() => useProductList());

    expect(result.current.products).toEqual([]);
    expect(result.current.pagination).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });
});
