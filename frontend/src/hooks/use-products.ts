'use client';

/**
 * TanStack Query hooks for product catalog operations.
 * Covers FR-019 (product catalog CRUD) and FR-020 (line card generation).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface Product {
  id: string;
  name: string;
  sku: string;
  brand: { id: string; name: string } | null;
  brand_id: string;
  category: string;
  subcategory: string | null;
  unit_price: number;
  wholesale_price: number | null;
  case_size: string | null;
  certifications: string[];
  allergens: string[];
  dietary_attributes: string[];
  availability_status: 'in_stock' | 'limited' | 'out_of_stock' | 'discontinued';
  revenue_model: 'broker' | 'wholesale';
  image_url: string | null;
  description: string | null;
  promo_price: number | null;
  promo_active: boolean;
  promo_start_date: string | null;
  promo_end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductListFilters {
  page?: number;
  per_page?: number;
  brand_id?: string;
  category?: string;
  certification?: string;
  allergen?: string;
  availability?: string;
  revenue_model?: string;
  is_active?: boolean;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

interface ProductListResponse {
  data: Product[];
  pagination: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
  };
}

interface ProductDetailResponse {
  data: Product;
}

export interface LineCard {
  id: string;
  brand_id: string;
  generated_by_id: string;
  document_url: string;
  document_size_bytes: number | null;
  product_count: number;
  generated_at: string;
  expires_at: string | null;
  created_at: string;
}

interface GenerateLineCardResponse {
  data: LineCard;
  product_count: number;
}

interface LineCardListResponse {
  data: LineCard[];
  pagination: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
  };
}

// -------------------------------------------------------------------
// Query keys
// -------------------------------------------------------------------

export const PRODUCT_CATALOG_KEYS = {
  all: ['products-catalog'] as const,
  lists: () => [...PRODUCT_CATALOG_KEYS.all, 'list'] as const,
  list: (filters: ProductListFilters) => [...PRODUCT_CATALOG_KEYS.lists(), filters] as const,
  details: () => [...PRODUCT_CATALOG_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PRODUCT_CATALOG_KEYS.details(), id] as const,
  lineCards: () => [...PRODUCT_CATALOG_KEYS.all, 'line-cards'] as const,
  lineCardsByBrand: (brandId: string) => [...PRODUCT_CATALOG_KEYS.lineCards(), brandId] as const,
} as const;

// -------------------------------------------------------------------
// useProductList — paginated product list with filters
// -------------------------------------------------------------------

interface UseProductListResult {
  products: Product[];
  pagination: ProductListResponse['pagination'] | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useProductList(filters: ProductListFilters = {}): UseProductListResult {
  const result = useQuery<ProductListResponse, Error>({
    queryKey: PRODUCT_CATALOG_KEYS.list(filters),
    queryFn: async (): Promise<ProductListResponse> => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.per_page) params.set('per_page', String(filters.per_page));
      if (filters.brand_id) params.set('brand_id', filters.brand_id);
      if (filters.category) params.set('category', filters.category);
      if (filters.certification) params.set('certification', filters.certification);
      if (filters.allergen) params.set('allergen', filters.allergen);
      if (filters.availability) params.set('availability', filters.availability);
      if (filters.revenue_model) params.set('revenue_model', filters.revenue_model);
      if (filters.is_active !== undefined) params.set('is_active', String(filters.is_active));
      if (filters.sort_by) params.set('sort_by', filters.sort_by);
      if (filters.sort_order) params.set('sort_order', filters.sort_order);
      return apiClient.get<ProductListResponse>(`/api/products?${params}`);
    },
  });

  return {
    products: result.data?.data ?? [],
    pagination: result.data?.pagination ?? null,
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
  };
}

// -------------------------------------------------------------------
// useProduct — single product detail
// -------------------------------------------------------------------

interface UseProductResult {
  product: Product | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useProduct(id: string): UseProductResult {
  const result = useQuery<ProductDetailResponse, Error>({
    queryKey: PRODUCT_CATALOG_KEYS.detail(id),
    queryFn: async (): Promise<ProductDetailResponse> => {
      return apiClient.get<ProductDetailResponse>(`/api/products/${id}`);
    },
    enabled: !!id,
  });

  return {
    product: result.data?.data ?? null,
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
  };
}

// -------------------------------------------------------------------
// useCreateProduct — create a new product
// -------------------------------------------------------------------

interface UseCreateProductResult {
  createProduct: (input: Record<string, unknown>) => void;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
}

export function useCreateProduct(): UseCreateProductResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<ProductDetailResponse, Error, Record<string, unknown>>({
    mutationFn: async (input): Promise<ProductDetailResponse> => {
      return apiClient.post<ProductDetailResponse>('/api/products', input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRODUCT_CATALOG_KEYS.lists() });
    },
  });

  return {
    createProduct: mutation.mutate,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
  };
}

// -------------------------------------------------------------------
// useUpdateProduct — update an existing product
// -------------------------------------------------------------------

interface UseUpdateProductResult {
  updateProduct: (input: { id: string; data: Record<string, unknown> }) => void;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
}

export function useUpdateProduct(): UseUpdateProductResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<ProductDetailResponse, Error, { id: string; data: Record<string, unknown> }>({
    mutationFn: async ({ id, data }): Promise<ProductDetailResponse> => {
      return apiClient.put<ProductDetailResponse>(`/api/products/${id}`, data);
    },
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: PRODUCT_CATALOG_KEYS.detail(id) });
      void queryClient.invalidateQueries({ queryKey: PRODUCT_CATALOG_KEYS.lists() });
    },
  });

  return {
    updateProduct: mutation.mutate,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
  };
}

// -------------------------------------------------------------------
// useGenerateLineCard — generate a brand line card
// -------------------------------------------------------------------

interface UseGenerateLineCardResult {
  generateLineCard: (brandId: string) => void;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
  data: GenerateLineCardResponse | undefined;
}

export function useGenerateLineCard(): UseGenerateLineCardResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<GenerateLineCardResponse, Error, string>({
    mutationFn: async (brandId): Promise<GenerateLineCardResponse> => {
      return apiClient.post<GenerateLineCardResponse>('/api/line-cards/generate', {
        brand_id: brandId,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRODUCT_CATALOG_KEYS.lineCards() });
    },
  });

  return {
    generateLineCard: mutation.mutate,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    data: mutation.data,
  };
}

// -------------------------------------------------------------------
// useLineCards — list line cards for a brand
// -------------------------------------------------------------------

interface UseLineCardsResult {
  lineCards: LineCard[];
  pagination: LineCardListResponse['pagination'] | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useLineCards(brandId: string): UseLineCardsResult {
  const result = useQuery<LineCardListResponse, Error>({
    queryKey: PRODUCT_CATALOG_KEYS.lineCardsByBrand(brandId),
    queryFn: async (): Promise<LineCardListResponse> => {
      const params = new URLSearchParams({ brand_id: brandId });
      return apiClient.get<LineCardListResponse>(`/api/line-cards?${params}`);
    },
    enabled: !!brandId,
  });

  return {
    lineCards: result.data?.data ?? [],
    pagination: result.data?.pagination ?? null,
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
  };
}
