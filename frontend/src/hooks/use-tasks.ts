import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface TaskItem {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigneeId: string;
  creatorId: string;
  accountId: string | null;
  contactId: string | null;
  completedAt: string | null;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListResponse {
  data: TaskItem[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
  };
}

export interface UseTasksParams {
  status?: string;
  priority?: string;
  overdue?: string;
  assigneeId?: string;
  accountId?: string;
  cursor?: string;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

function buildTaskQueryString(params: UseTasksParams): string {
  const searchParams = new URLSearchParams();

  if (params.status) searchParams.set('status', params.status);
  if (params.priority) searchParams.set('priority', params.priority);
  if (params.overdue) searchParams.set('overdue', params.overdue);
  if (params.assigneeId) searchParams.set('assigneeId', params.assigneeId);
  if (params.accountId) searchParams.set('accountId', params.accountId);
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export function useTasks(
  params: UseTasksParams,
): ReturnType<typeof useQuery<TaskListResponse>> {
  return useQuery<TaskListResponse>({
    queryKey: ['tasks', params.status, params.priority, params.overdue, params.cursor],
    queryFn: async () => {
      const response = await apiClient<TaskListResponse>(
        `/api/tasks${buildTaskQueryString(params)}`,
      );
      return response;
    },
  });
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  assigneeId: string;
  accountId?: string;
  contactId?: string;
}

export function useCreateTask(): ReturnType<typeof useMutation<{ data: TaskItem }, Error, CreateTaskInput>> {
  const queryClient = useQueryClient();

  return useMutation<{ data: TaskItem }, Error, CreateTaskInput>({
    mutationFn: async (input) => {
      const response = await apiClient<{ data: TaskItem }>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export interface UpdateTaskInput {
  id: string;
  data: {
    title?: string;
    description?: string | null;
    dueDate?: string;
    priority?: 'high' | 'medium' | 'low';
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    assigneeId?: string;
    accountId?: string | null;
    contactId?: string | null;
  };
}

export function useUpdateTask(): ReturnType<typeof useMutation<{ data: TaskItem }, Error, UpdateTaskInput>> {
  const queryClient = useQueryClient();

  return useMutation<{ data: TaskItem }, Error, UpdateTaskInput>({
    mutationFn: async (input) => {
      const response = await apiClient<{ data: TaskItem }>(`/api/tasks/${input.id}`, {
        method: 'PUT',
        body: JSON.stringify(input.data),
      });
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
