'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type: string;
  created_at: string;
}

interface NotificationListResponse {
  data: Notification[];
  meta: {
    total: number;
    unread_count: number;
  };
}

interface UnreadCountResponse {
  data: {
    count: number;
  };
}

interface MarkAsReadResponse {
  data: Notification;
}

// -------------------------------------------------------------------
// Query keys
// -------------------------------------------------------------------

const NOTIFICATION_KEYS = {
  all: ['notifications'] as const,
  list: () => [...NOTIFICATION_KEYS.all, 'list'] as const,
  unreadCount: () => [...NOTIFICATION_KEYS.all, 'unread-count'] as const,
} as const;

// -------------------------------------------------------------------
// useNotificationsList — list with polling every 30 seconds
// -------------------------------------------------------------------

interface UseNotificationsListResult {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useNotificationsList(): UseNotificationsListResult {
  const query = useQuery<NotificationListResponse, Error>({
    queryKey: NOTIFICATION_KEYS.list(),
    queryFn: async (): Promise<NotificationListResponse> => {
      return apiClient.get<NotificationListResponse>('/api/notifications');
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  return {
    notifications: query.data?.data ?? [],
    total: query.data?.meta?.total ?? 0,
    unreadCount: query.data?.meta?.unread_count ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// -------------------------------------------------------------------
// useUnreadCount — just the unread count, polled every 30 seconds
// -------------------------------------------------------------------

interface UseUnreadCountResult {
  count: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useUnreadCount(): UseUnreadCountResult {
  const query = useQuery<UnreadCountResponse, Error>({
    queryKey: NOTIFICATION_KEYS.unreadCount(),
    queryFn: async (): Promise<UnreadCountResponse> => {
      return apiClient.get<UnreadCountResponse>('/api/notifications/unread-count');
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  return {
    count: query.data?.data?.count ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// -------------------------------------------------------------------
// useMarkAsRead — mutation for marking a notification as read
// -------------------------------------------------------------------

interface UseMarkAsReadResult {
  markAsRead: (id: string) => void;
  markAsReadAsync: (id: string) => Promise<MarkAsReadResponse>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

export function useMarkAsRead(): UseMarkAsReadResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<MarkAsReadResponse, Error, string>({
    mutationFn: async (id: string): Promise<MarkAsReadResponse> => {
      return apiClient.post<MarkAsReadResponse>(`/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });

  return {
    markAsRead: mutation.mutate,
    markAsReadAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
