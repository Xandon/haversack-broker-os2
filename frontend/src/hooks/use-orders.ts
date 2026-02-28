'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export interface Order {
  id: string;
  orderNumber: string;
  accountId: string;
  assignedRepId: string;
  status: string;
  orderType: string;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  account?: { id: string; name: string };
  assignedRep?: { id: string; firstName: string; lastName: string };
  lineItems?: OrderLineItem[];
}

export interface OrderLineItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  revenueModel: string;
  product?: { id: string; name: string; sku: string };
}

interface OrderListResponse {
  data: Order[];
  total: number;
  page: number;
  limit: number;
}

interface OrderResponse {
  data: Order;
}

export function useOrders(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;

  return useQuery<OrderListResponse>({
    queryKey: ['orders', params],
    queryFn: () => {
      const searchParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(params?.search && { search: params.search }),
        ...(params?.status && { status: params.status }),
      });
      return apiClient.get(`/api/orders?${searchParams}`);
    },
  });
}

export function useOrder(id: string) {
  return useQuery<OrderResponse>({
    queryKey: ['orders', id],
    queryFn: () => apiClient.get(`/api/orders/${id}`),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      accountId: string;
      lineItems: { productId: string; quantity: number }[];
      notes?: string;
    }) => apiClient.post<OrderResponse>('/api/orders', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
