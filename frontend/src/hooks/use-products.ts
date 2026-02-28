'use client';

import type { CreateProductInput, UpdateProductInput } from '@haversack/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export interface Product {
  id: string;
  brandId: string;
  name: string;
  sku: string;
  category: string;
  subcategory?: string;
  unitPrice: number;
  wholesalePrice?: number;
  caseSize?: string;
  certifications: string[];
  allergens: string[];
  dietaryAttributes: string[];
  availabilityStatus: string;
  imageUrl?: string;
  description?: string;
  revenueModel: string;
  promoPrice?: number;
  promoStartDate?: string;
  promoEndDate?: string;
  isActive: boolean;
  brand?: { id: string; name: string };
}

export interface Brand {
  id: string;
  name: string;
  baseCommissionRate: number;
  defaultRevenueModel: string;
  logoUrl?: string;
  description?: string;
  isActive: boolean;
  _count?: { products: number };
}

interface ProductListResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

interface BrandListResponse {
  data: Brand[];
}

export function useProducts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  brandId?: string;
  category?: string;
}) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;

  return useQuery<ProductListResponse>({
    queryKey: ['products', params],
    queryFn: () => {
      const searchParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(params?.search && { search: params.search }),
        ...(params?.brandId && { brandId: params.brandId }),
        ...(params?.category && { category: params.category }),
      });
      return apiClient.get(`/api/products?${searchParams}`);
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => apiClient.get<{ data: Product }>(`/api/products/${id}`),
    enabled: !!id,
  });
}

export function useBrands() {
  return useQuery<BrandListResponse>({
    queryKey: ['brands'],
    queryFn: () => apiClient.get('/api/brands'),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) =>
      apiClient.post<{ data: Product }>('/api/products', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProductInput) =>
      apiClient.patch<{ data: Product }>(`/api/products/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useProductSearch(query: string) {
  return useQuery({
    queryKey: ['products', 'search', query],
    queryFn: () =>
      apiClient.get<{ data: Product[] }>(`/api/products/search?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
  });
}
