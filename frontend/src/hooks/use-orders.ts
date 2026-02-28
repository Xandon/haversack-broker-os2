import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  OrderResponse,
  OrderListResponse,
  OrderStatus,
  CreateOrderInput,
  UpdateOrderInput,
  RejectionReasonInput,
} from '@haversack/shared';

export type { OrderResponse, OrderListResponse, OrderStatus };

export interface OrderListApiResponse {
  data: OrderListResponse[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
  };
}

export interface UseOrdersParams {
  accountId?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
  cursor?: string;
  limit?: number;
}

function buildQueryString(params: UseOrdersParams): string {
  const searchParams = new URLSearchParams();

  if (params.accountId) searchParams.set('accountId', params.accountId);
  if (params.status) searchParams.set('status', params.status);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export function useOrders(params: UseOrdersParams): ReturnType<typeof useQuery<OrderListApiResponse>> {
  return useQuery<OrderListApiResponse>({
    queryKey: ['orders', params],
    queryFn: async () => {
      const response = await apiClient<OrderListApiResponse>(
        `/api/orders${buildQueryString(params)}`,
      );
      return response;
    },
  });
}

export function useOrder(orderId: string | undefined): ReturnType<typeof useQuery<{ data: OrderResponse }>> {
  return useQuery<{ data: OrderResponse }>({
    queryKey: ['orders', orderId],
    queryFn: async () => {
      const response = await apiClient<{ data: OrderResponse }>(
        `/api/orders/${orderId}`,
      );
      return response;
    },
    enabled: Boolean(orderId),
  });
}

export function useCreateOrder(): ReturnType<typeof useMutation<{ data: OrderResponse }, Error, CreateOrderInput>> {
  const queryClient = useQueryClient();

  return useMutation<{ data: OrderResponse }, Error, CreateOrderInput>({
    mutationFn: async (input) => {
      const response = await apiClient<{ data: OrderResponse }>('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateOrder(): ReturnType<typeof useMutation<{ data: OrderResponse }, Error, { orderId: string; input: UpdateOrderInput; version?: number }>> {
  const queryClient = useQueryClient();

  return useMutation<{ data: OrderResponse }, Error, { orderId: string; input: UpdateOrderInput; version?: number }>({
    mutationFn: async ({ orderId, input, version }) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (version !== undefined) {
        headers['if-match'] = String(version);
      }
      const response = await apiClient<{ data: OrderResponse }>(
        `/api/orders/${orderId}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify(input),
        },
      );
      return response;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['orders', variables.orderId] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useSubmitOrder(): ReturnType<typeof useMutation<{ data: OrderResponse }, Error, string>> {
  const queryClient = useQueryClient();

  return useMutation<{ data: OrderResponse }, Error, string>({
    mutationFn: async (orderId) => {
      const response = await apiClient<{ data: OrderResponse }>(
        `/api/orders/${orderId}/submit`,
        { method: 'POST' },
      );
      return response;
    },
    onSuccess: (_data, orderId) => {
      void queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useCancelOrder(): ReturnType<typeof useMutation<{ data: OrderResponse }, Error, string>> {
  const queryClient = useQueryClient();

  return useMutation<{ data: OrderResponse }, Error, string>({
    mutationFn: async (orderId) => {
      const response = await apiClient<{ data: OrderResponse }>(
        `/api/orders/${orderId}/cancel`,
        { method: 'POST' },
      );
      return response;
    },
    onSuccess: (_data, orderId) => {
      void queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useApproveOrder(): ReturnType<typeof useMutation<{ data: OrderResponse }, Error, string>> {
  const queryClient = useQueryClient();

  return useMutation<{ data: OrderResponse }, Error, string>({
    mutationFn: async (orderId) => {
      const response = await apiClient<{ data: OrderResponse }>(
        `/api/orders/${orderId}/approve`,
        { method: 'POST' },
      );
      return response;
    },
    onSuccess: (_data, orderId) => {
      void queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
    },
  });
}

export function useRejectOrder(): ReturnType<typeof useMutation<{ data: OrderResponse }, Error, { orderId: string; reason: string }>> {
  const queryClient = useQueryClient();

  return useMutation<{ data: OrderResponse }, Error, { orderId: string; reason: string }>({
    mutationFn: async ({ orderId, reason }) => {
      const response = await apiClient<{ data: OrderResponse }>(
        `/api/orders/${orderId}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason } satisfies RejectionReasonInput),
        },
      );
      return response;
    },
    onSuccess: (_data, { orderId }) => {
      void queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
    },
  });
}

export function useApprovalQueue(params: { cursor?: string; limit?: number }): ReturnType<typeof useQuery<OrderListApiResponse>> {
  return useQuery<OrderListApiResponse>({
    queryKey: ['approval-queue', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.cursor) searchParams.set('cursor', params.cursor);
      if (params.limit) searchParams.set('limit', String(params.limit));
      const qs = searchParams.toString();
      const response = await apiClient<OrderListApiResponse>(
        `/api/orders/approval-queue${qs ? `?${qs}` : ''}`,
      );
      return response;
    },
  });
}
