import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { BrandWithCountsResponse, BrandResponse } from '@haversack/shared';

export type { BrandWithCountsResponse, BrandResponse };

export interface BrandListApiResponse {
  data: BrandWithCountsResponse[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
  };
}

export interface UseBrandsParams {
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: string;
  cursor?: string;
  limit?: number;
}

function buildQueryString(params: UseBrandsParams): string {
  const searchParams = new URLSearchParams();

  if (params.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export function useBrands(
  params: UseBrandsParams = {},
): ReturnType<typeof useQuery<BrandListApiResponse>> {
  return useQuery<BrandListApiResponse>({
    queryKey: ['brands', params],
    queryFn: async () => {
      const response = await apiClient<BrandListApiResponse>(
        `/api/brands${buildQueryString(params)}`,
      );
      return response;
    },
  });
}

export interface BrandDetailApiResponse {
  data: BrandResponse;
}

export function useBrand(
  brandId: string | undefined,
): ReturnType<typeof useQuery<BrandDetailApiResponse>> {
  return useQuery<BrandDetailApiResponse>({
    queryKey: ['brands', brandId],
    queryFn: async () => {
      const response = await apiClient<BrandDetailApiResponse>(
        `/api/brands/${brandId}`,
      );
      return response;
    },
    enabled: Boolean(brandId),
  });
}
