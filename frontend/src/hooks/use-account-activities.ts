import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface TimelineItem {
  id: string;
  type: 'activity' | 'email' | 'task';
  occurredAt: string;
  data: Record<string, unknown>;
}

export interface TimelineResponse {
  data: TimelineItem[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
  };
  counts: {
    activity: number;
    email: number;
    task: number;
  };
}

export interface UseAccountActivitiesParams {
  accountId: string;
  activityType?: string;
  limit?: number;
}

function buildTimelineQuery(
  accountId: string,
  params: { activityType?: string; limit?: number; cursor?: string },
): string {
  const searchParams = new URLSearchParams();
  if (params.activityType) searchParams.set('activityType', params.activityType);
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.cursor) searchParams.set('cursor', params.cursor);
  const qs = searchParams.toString();
  return `/api/accounts/${accountId}/timeline${qs ? `?${qs}` : ''}`;
}

export function useAccountActivities(
  params: UseAccountActivitiesParams,
): ReturnType<typeof useInfiniteQuery<TimelineResponse>> {
  return useInfiniteQuery<TimelineResponse>({
    queryKey: ['account-timeline', params.accountId, params.activityType],
    queryFn: async ({ pageParam }) => {
      const response = await apiClient<TimelineResponse>(
        buildTimelineQuery(params.accountId, {
          activityType: params.activityType,
          limit: params.limit ?? 20,
          cursor: pageParam as string | undefined,
        }),
      );
      return response;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.cursor : undefined,
    enabled: Boolean(params.accountId),
  });
}
