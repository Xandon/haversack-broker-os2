import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface ActivityDemo {
  id: string;
  productId: string;
  quantitySampled: number | null;
  buyerFeedback: string | null;
  outcome: string | null;
}

export interface ActivityItem {
  id: string;
  tenantId: string;
  accountId: string;
  userId: string;
  type: 'visit' | 'call' | 'email' | 'demo' | 'sampling';
  notes: string | null;
  occurredAt: string;
  durationMinutes: number | null;
  version: number;
  demos: ActivityDemo[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityListResponse {
  data: ActivityItem[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
  };
}

export interface UseActivitiesParams {
  accountId: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  cursor?: string;
  limit?: number;
}

function buildActivityQueryString(params: UseActivitiesParams): string {
  const searchParams = new URLSearchParams();

  if (params.type) searchParams.set('type', params.type);
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export function useActivities(
  params: UseActivitiesParams,
): ReturnType<typeof useQuery<ActivityListResponse>> {
  return useQuery<ActivityListResponse>({
    queryKey: ['activities', params.accountId, params.type, params.startDate, params.endDate, params.cursor],
    queryFn: async () => {
      const response = await apiClient<ActivityListResponse>(
        `/api/accounts/${params.accountId}/activities${buildActivityQueryString(params)}`,
      );
      return response;
    },
    enabled: Boolean(params.accountId),
  });
}

export interface CreateActivityInput {
  accountId: string;
  type: 'visit' | 'call' | 'email' | 'demo' | 'sampling';
  notes?: string;
  occurredAt: string;
  durationMinutes?: number;
  demos?: Array<{
    productId: string;
    quantitySampled?: number;
    buyerFeedback?: string;
    outcome?: 'positive' | 'neutral' | 'negative';
  }>;
}

export function useCreateActivity(): ReturnType<typeof useMutation<{ data: ActivityItem }, Error, CreateActivityInput>> {
  const queryClient = useQueryClient();

  return useMutation<{ data: ActivityItem }, Error, CreateActivityInput>({
    mutationFn: async (input) => {
      const response = await apiClient<{ data: ActivityItem }>('/api/activities', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return response;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['activities', variables.accountId] });
      void queryClient.invalidateQueries({ queryKey: ['account-timeline', variables.accountId] });
    },
  });
}
