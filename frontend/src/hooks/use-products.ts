import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ProductResponse } from '@haversack/shared';

export type { ProductResponse };

export interface ProductListApiResponse {
  data: ProductResponse[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
  };
}

export interface UseProductsParams {
  brandId?: string;
  category?: string;
  certification?: string;
  availabilityStatus?: string;
  sortBy?: string;
  sortOrder?: string;
  cursor?: string;
  limit?: number;
}

function buildQueryString(params: UseProductsParams): string {
  const searchParams = new URLSearchParams();

  if (params.brandId) searchParams.set('brandId', params.brandId);
  if (params.category) searchParams.set('category', params.category);
  if (params.certification) searchParams.set('certification', params.certification);
  if (params.availabilityStatus) searchParams.set('availabilityStatus', params.availabilityStatus);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export function useProducts(
  params: UseProductsParams,
): ReturnType<typeof useQuery<ProductListApiResponse>> {
  return useQuery<ProductListApiResponse>({
    queryKey: ['products', params],
    queryFn: async () => {
      const response = await apiClient<ProductListApiResponse>(
        `/api/products${buildQueryString(params)}`,
      );
      return response;
    },
  });
}

export interface ProductDetailApiResponse {
  data: ProductResponse;
}

export function useProduct(
  productId: string | undefined,
): ReturnType<typeof useQuery<ProductDetailApiResponse>> {
  return useQuery<ProductDetailApiResponse>({
    queryKey: ['products', productId],
    queryFn: async () => {
      const response = await apiClient<ProductDetailApiResponse>(
        `/api/products/${productId}`,
      );
      return response;
    },
    enabled: Boolean(productId),
  });
}
