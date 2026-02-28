import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type NotificationType =
  | 'task_reminder'
  | 'task_assigned'
  | 'task_overdue'
  | 'order_approval_required'
  | 'order_approved'
  | 'order_rejected'
  | 'order_export_failed';

export interface NotificationItem {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  referenceId: string | null;
  referenceType: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  data: NotificationItem[];
  pagination: {
    page: number;
    perPage: number;
    totalCount: number;
  };
  unreadCount: number;
}

export interface MarkReadResponse {
  data: {
    id: string;
    isRead: boolean;
    readAt: string;
  };
}

export interface MarkAllReadResponse {
  data: {
    markedCount: number;
  };
}

export function useNotifications(
  params: { isRead?: boolean; page?: number } = {},
): ReturnType<typeof useQuery<NotificationsResponse>> {
  const searchParams = new URLSearchParams();
  if (params.isRead !== undefined) searchParams.set('is_read', String(params.isRead));
  if (params.page) searchParams.set('page', String(params.page));
  const qs = searchParams.toString();

  return useQuery<NotificationsResponse>({
    queryKey: ['notifications', params],
    queryFn: async () => {
      const response = await apiClient<NotificationsResponse>(
        `/api/notifications${qs ? `?${qs}` : ''}`,
      );
      return response;
    },
    refetchInterval: 30000,
  });
}

export function useUnreadCount(): ReturnType<typeof useQuery<{ unreadCount: number }>> {
  return useQuery<{ unreadCount: number }>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await apiClient<NotificationsResponse>(
        '/api/notifications?per_page=1',
      );
      return { unreadCount: response.unreadCount };
    },
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead(): ReturnType<
  typeof useMutation<MarkReadResponse, Error, string>
> {
  const queryClient = useQueryClient();

  return useMutation<MarkReadResponse, Error, string>({
    mutationFn: async (notificationId) => {
      const response = await apiClient<MarkReadResponse>(
        `/api/notifications/${notificationId}/read`,
        { method: 'PATCH' },
      );
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllRead(): ReturnType<
  typeof useMutation<MarkAllReadResponse, Error, void>
> {
  const queryClient = useQueryClient();

  return useMutation<MarkAllReadResponse, Error, void>({
    mutationFn: async () => {
      const response = await apiClient<MarkAllReadResponse>(
        '/api/notifications/read-all',
        { method: 'POST' },
      );
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
