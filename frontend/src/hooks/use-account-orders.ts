import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { OrderListApiResponse } from '@/hooks/use-orders';

export function useAccountOrders(
  accountId: string,
  params?: { limit?: number; cursor?: string },
): ReturnType<typeof useQuery<OrderListApiResponse>> {
  return useQuery<OrderListApiResponse>({
    queryKey: ['account-orders', accountId, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('accountId', accountId);
      searchParams.set('sortBy', 'createdAt');
      searchParams.set('sortOrder', 'desc');
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.cursor) searchParams.set('cursor', params.cursor);
      const response = await apiClient<OrderListApiResponse>(
        `/api/orders?${searchParams.toString()}`,
      );
      return response;
    },
    enabled: Boolean(accountId),
  });
}
