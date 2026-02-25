'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
  assigned_to: string;
  assigned_to_name: string;
  account_id: string | null;
  contact_id: string | null;
  created_by: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  due_date: string;
  priority: TaskPriority;
  assigned_to: string;
  account_id?: string;
  contact_id?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  due_date?: string;
  priority?: TaskPriority;
  assigned_to?: string;
  status?: TaskStatus;
  account_id?: string;
  contact_id?: string;
}

export interface TaskListFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  sort_by?: 'due_date' | 'priority' | 'created_at';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

interface TaskListResponse {
  data: Task[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface TaskResponse {
  data: Task;
}

// -------------------------------------------------------------------
// Query keys
// -------------------------------------------------------------------

const TASK_KEYS = {
  all: ['tasks'] as const,
  lists: () => [...TASK_KEYS.all, 'list'] as const,
  list: (filters: TaskListFilters) => [...TASK_KEYS.lists(), filters] as const,
  details: () => [...TASK_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...TASK_KEYS.details(), id] as const,
} as const;

// -------------------------------------------------------------------
// useTasks — paginated task list with filters
// -------------------------------------------------------------------

interface UseTasksResult {
  tasks: Task[];
  meta: TaskListResponse['meta'] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useTasks(filters: TaskListFilters = {}): UseTasksResult {
  const query = useQuery<TaskListResponse, Error>({
    queryKey: TASK_KEYS.list(filters),
    queryFn: async (): Promise<TaskListResponse> => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.sort_by) params.set('sort_by', filters.sort_by);
      if (filters.sort_order) params.set('sort_order', filters.sort_order);
      if (filters.page != null) params.set('page', String(filters.page));
      if (filters.limit != null) params.set('limit', String(filters.limit));

      const queryString = params.toString();
      const path = queryString ? `/api/tasks?${queryString}` : '/api/tasks';
      return apiClient.get<TaskListResponse>(path);
    },
  });

  return {
    tasks: query.data?.data ?? [],
    meta: query.data?.meta,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// -------------------------------------------------------------------
// useTask — single task by ID
// -------------------------------------------------------------------

interface UseTaskResult {
  task: Task | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useTask(id: string): UseTaskResult {
  const query = useQuery<TaskResponse, Error>({
    queryKey: TASK_KEYS.detail(id),
    queryFn: async (): Promise<TaskResponse> => {
      return apiClient.get<TaskResponse>(`/api/tasks/${id}`);
    },
    enabled: id.length > 0,
  });

  return {
    task: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// -------------------------------------------------------------------
// useCreateTask — mutation for creating a task
// -------------------------------------------------------------------

interface UseCreateTaskResult {
  createTask: (payload: CreateTaskPayload) => void;
  createTaskAsync: (payload: CreateTaskPayload) => Promise<TaskResponse>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
  data: TaskResponse | undefined;
}

export function useCreateTask(): UseCreateTaskResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<TaskResponse, Error, CreateTaskPayload>({
    mutationFn: async (payload: CreateTaskPayload): Promise<TaskResponse> => {
      return apiClient.post<TaskResponse>('/api/tasks', payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TASK_KEYS.all });
    },
  });

  return {
    createTask: mutation.mutate,
    createTaskAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
}

// -------------------------------------------------------------------
// useUpdateTask — mutation for updating a task
// -------------------------------------------------------------------

interface UpdateTaskArgs {
  id: string;
  payload: UpdateTaskPayload;
}

interface UseUpdateTaskResult {
  updateTask: (args: UpdateTaskArgs) => void;
  updateTaskAsync: (args: UpdateTaskArgs) => Promise<TaskResponse>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
}

export function useUpdateTask(): UseUpdateTaskResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<TaskResponse, Error, UpdateTaskArgs>({
    mutationFn: async ({ id, payload }: UpdateTaskArgs): Promise<TaskResponse> => {
      return apiClient.patch<TaskResponse>(`/api/tasks/${id}`, payload);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: TASK_KEYS.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: TASK_KEYS.lists() });
    },
  });

  return {
    updateTask: mutation.mutate,
    updateTaskAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}

// -------------------------------------------------------------------
// useCompleteTask — mutation for completing a task
// -------------------------------------------------------------------

interface UseCompleteTaskResult {
  completeTask: (id: string) => void;
  completeTaskAsync: (id: string) => Promise<TaskResponse>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
}

export function useCompleteTask(): UseCompleteTaskResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<TaskResponse, Error, string>({
    mutationFn: async (id: string): Promise<TaskResponse> => {
      return apiClient.patch<TaskResponse>(`/api/tasks/${id}`, { status: 'completed' });
    },
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: TASK_KEYS.detail(id) });
      void queryClient.invalidateQueries({ queryKey: TASK_KEYS.lists() });
    },
  });

  return {
    completeTask: mutation.mutate,
    completeTaskAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}
