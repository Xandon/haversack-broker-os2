'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export type NotificationType =
  | 'task_reminder'
  | 'order_approval'
  | 'commission_approval'
  | 'system'
  | 'mention';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  linkUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationListResult {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
}

export function useNotifications(page: number = 1, isRead?: boolean) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  if (isRead !== undefined) {
    params.set('isRead', String(isRead));
  }

  return useQuery<NotificationListResult>({
    queryKey: ['notifications', page, isRead],
    queryFn: () => apiClient.get(`/api/notifications?${params.toString()}`),
  });
}

export function useUnreadCount() {
  return useQuery<{ count: number }>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => apiClient.get('/api/notifications/unread-count'),
    refetchInterval: 30000,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation<{ id: string; isRead: boolean; readAt: string | null }, Error, string>({
    mutationFn: (id) => apiClient.patch(`/api/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation<{ count: number }, Error, void>({
    mutationFn: () => apiClient.patch('/api/notifications/read-all', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
