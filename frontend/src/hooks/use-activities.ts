'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export type ActivityType = 'visit' | 'call' | 'email' | 'demo' | 'sampling' | 'note';

export interface Activity {
  id: string;
  account_id: string;
  contact_id: string | null;
  user_id: string;
  user_name: string;
  activity_type: ActivityType;
  subject: string;
  notes: string | null;
  duration_minutes: number | null;
  product_demoed: string | null;
  quantity_sampled: number | null;
  buyer_feedback: string | null;
  products: string | null;
  activity_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateActivityPayload {
  account_id: string;
  contact_id?: string;
  activity_type: ActivityType;
  subject: string;
  notes?: string;
  duration_minutes?: number;
  product_demoed?: string;
  quantity_sampled?: number;
  buyer_feedback?: string;
  products?: string;
  activity_date: string;
}

interface ActivityListResponse {
  data: Activity[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

interface ActivityResponse {
  data: Activity;
}

export interface ActivityListOptions {
  limit?: number;
  activity_type?: ActivityType;
}

// -------------------------------------------------------------------
// Query keys
// -------------------------------------------------------------------

const ACTIVITY_KEYS = {
  all: ['activities'] as const,
  lists: () => [...ACTIVITY_KEYS.all, 'list'] as const,
  listByAccount: (accountId: string, options?: ActivityListOptions) =>
    [...ACTIVITY_KEYS.lists(), accountId, options] as const,
  details: () => [...ACTIVITY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ACTIVITY_KEYS.details(), id] as const,
} as const;

// -------------------------------------------------------------------
// useActivities — infinite scroll activity list for an account
// -------------------------------------------------------------------

interface UseActivitiesResult {
  activities: Activity[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export function useActivities(
  accountId: string,
  options?: ActivityListOptions,
): UseActivitiesResult {
  const limit = options?.limit ?? 20;

  const query = useInfiniteQuery<ActivityListResponse, Error>({
    queryKey: ACTIVITY_KEYS.listByAccount(accountId, options),
    queryFn: async ({ pageParam }): Promise<ActivityListResponse> => {
      const params = new URLSearchParams();
      params.set('page', String(pageParam));
      params.set('limit', String(limit));
      if (options?.activity_type) {
        params.set('activity_type', options.activity_type);
      }
      return apiClient.get<ActivityListResponse>(
        `/api/accounts/${accountId}/activities?${params.toString()}`,
      );
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage): number | undefined => {
      if (lastPage.meta.hasNextPage) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    enabled: accountId.length > 0,
  });

  const activities = query.data?.pages.flatMap((page) => page.data) ?? [];

  return {
    activities,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    fetchNextPage: () => {
      void query.fetchNextPage();
    },
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

// -------------------------------------------------------------------
// useActivity — single activity by ID
// -------------------------------------------------------------------

interface UseActivityResult {
  activity: Activity | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useActivity(id: string): UseActivityResult {
  const query = useQuery<ActivityResponse, Error>({
    queryKey: ACTIVITY_KEYS.detail(id),
    queryFn: async (): Promise<ActivityResponse> => {
      return apiClient.get<ActivityResponse>(`/api/activities/${id}`);
    },
    enabled: id.length > 0,
  });

  return {
    activity: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// -------------------------------------------------------------------
// useCreateActivity — mutation for creating an activity
// -------------------------------------------------------------------

interface UseCreateActivityResult {
  createActivity: (payload: CreateActivityPayload) => void;
  createActivityAsync: (payload: CreateActivityPayload) => Promise<ActivityResponse>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
  data: ActivityResponse | undefined;
}

export function useCreateActivity(): UseCreateActivityResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<ActivityResponse, Error, CreateActivityPayload>({
    mutationFn: async (payload: CreateActivityPayload): Promise<ActivityResponse> => {
      return apiClient.post<ActivityResponse>('/api/activities', payload);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ACTIVITY_KEYS.listByAccount(variables.account_id),
      });
      void queryClient.invalidateQueries({ queryKey: ACTIVITY_KEYS.lists() });
    },
  });

  return {
    createActivity: mutation.mutate,
    createActivityAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
}
