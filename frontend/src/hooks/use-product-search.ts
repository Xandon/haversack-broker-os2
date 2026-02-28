import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ProductResponse } from '@haversack/shared';

export type { ProductResponse };

export interface ProductSearchApiResponse {
  data: ProductResponse[];
}

export interface UseProductSearchParams {
  q: string;
  brandId?: string;
  availabilityStatus?: string;
  limit?: number;
}

function buildQueryString(params: UseProductSearchParams): string {
  const searchParams = new URLSearchParams();

  searchParams.set('q', params.q);
  if (params.brandId) searchParams.set('brandId', params.brandId);
  if (params.availabilityStatus) searchParams.set('availabilityStatus', params.availabilityStatus);
  if (params.limit) searchParams.set('limit', String(params.limit));

  return `?${searchParams.toString()}`;
}

export function useProductSearch(
  params: UseProductSearchParams,
): ReturnType<typeof useQuery<ProductSearchApiResponse>> {
  const enabled = params.q.length >= 2;

  return useQuery<ProductSearchApiResponse>({
    queryKey: ['product-search', params],
    queryFn: async () => {
      const response = await apiClient<ProductSearchApiResponse>(
        `/api/products/search${buildQueryString(params)}`,
      );
      return response;
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export async function searchProducts(query: string): Promise<ProductResponse[]> {
  if (query.length < 2) return [];
  const response = await apiClient<ProductSearchApiResponse>(
    `/api/products/search?q=${encodeURIComponent(query)}&limit=20`,
  );
  return response.data;
}
