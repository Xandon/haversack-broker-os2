'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export type UserRole = 'admin' | 'manager' | 'rep' | 'logistics' | 'viewer';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  territory_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserListFilters {
  page?: number;
  per_page?: number;
  role?: UserRole;
  is_active?: boolean;
  search?: string;
}

export interface CreateUserPayload {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role: UserRole;
  territory_id?: string;
}

export interface UpdateUserPayload {
  first_name?: string;
  last_name?: string;
  role?: UserRole;
  territory_id?: string | null;
}

interface UserListResponse {
  data: User[];
  pagination: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
  };
}

interface UserResponse {
  data: User;
}

// -------------------------------------------------------------------
// Query keys
// -------------------------------------------------------------------

const USER_KEYS = {
  all: ['users'] as const,
  lists: () => [...USER_KEYS.all, 'list'] as const,
  list: (filters: UserListFilters) => [...USER_KEYS.lists(), filters] as const,
  details: () => [...USER_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...USER_KEYS.details(), id] as const,
} as const;

// -------------------------------------------------------------------
// useUsers — paginated user list
// -------------------------------------------------------------------

interface UseUsersResult {
  users: User[];
  pagination: UserListResponse['pagination'] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useUsers(filters: UserListFilters = {}): UseUsersResult {
  const query = useQuery<UserListResponse, Error>({
    queryKey: USER_KEYS.list(filters),
    queryFn: async (): Promise<UserListResponse> => {
      const params = new URLSearchParams();
      if (filters.page != null) params.set('page', String(filters.page));
      if (filters.per_page != null) params.set('per_page', String(filters.per_page));
      if (filters.role) params.set('role', filters.role);
      if (filters.is_active != null) params.set('is_active', String(filters.is_active));
      if (filters.search) params.set('search', filters.search);

      const queryString = params.toString();
      const path = queryString ? `/api/admin/users?${queryString}` : '/api/admin/users';
      return apiClient.get<UserListResponse>(path);
    },
  });

  return {
    users: query.data?.data ?? [],
    pagination: query.data?.pagination,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// -------------------------------------------------------------------
// useUser — single user detail
// -------------------------------------------------------------------

interface UseUserResult {
  user: User | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useUser(id: string): UseUserResult {
  const query = useQuery<UserResponse, Error>({
    queryKey: USER_KEYS.detail(id),
    queryFn: async (): Promise<UserResponse> => {
      return apiClient.get<UserResponse>(`/api/admin/users/${id}`);
    },
    enabled: id.length > 0,
  });

  return {
    user: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// -------------------------------------------------------------------
// useCreateUser — mutation for creating a user
// -------------------------------------------------------------------

interface UseCreateUserResult {
  createUser: (payload: CreateUserPayload) => void;
  createUserAsync: (payload: CreateUserPayload) => Promise<UserResponse>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
}

export function useCreateUser(): UseCreateUserResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<UserResponse, Error, CreateUserPayload>({
    mutationFn: async (payload: CreateUserPayload): Promise<UserResponse> => {
      return apiClient.post<UserResponse>('/api/admin/users', payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: USER_KEYS.all });
    },
  });

  return {
    createUser: mutation.mutate,
    createUserAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}

// -------------------------------------------------------------------
// useUpdateUser — mutation for updating a user
// -------------------------------------------------------------------

interface UseUpdateUserResult {
  updateUser: (id: string, payload: UpdateUserPayload) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useUpdateUser(): UseUpdateUserResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<UserResponse, Error, { id: string; payload: UpdateUserPayload }>({
    mutationFn: async ({ id, payload }): Promise<UserResponse> => {
      return apiClient.patch<UserResponse>(`/api/admin/users/${id}`, payload);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: USER_KEYS.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: USER_KEYS.lists() });
    },
  });

  return {
    updateUser: (id: string, payload: UpdateUserPayload) => mutation.mutate({ id, payload }),
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

// -------------------------------------------------------------------
// useDeactivateUser — mutation for deactivating a user
// -------------------------------------------------------------------

interface UseDeactivateUserResult {
  deactivateUser: (id: string, reason?: string) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useDeactivateUser(): UseDeactivateUserResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<UserResponse, Error, { id: string; reason?: string }>({
    mutationFn: async ({ id, reason }): Promise<UserResponse> => {
      return apiClient.post<UserResponse>(`/api/admin/users/${id}/deactivate`, { reason });
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: USER_KEYS.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: USER_KEYS.lists() });
    },
  });

  return {
    deactivateUser: (id: string, reason?: string) => mutation.mutate({ id, reason }),
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

// -------------------------------------------------------------------
// useReactivateUser — mutation for reactivating a user
// -------------------------------------------------------------------

interface UseReactivateUserResult {
  reactivateUser: (id: string) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useReactivateUser(): UseReactivateUserResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<UserResponse, Error, string>({
    mutationFn: async (id: string): Promise<UserResponse> => {
      return apiClient.post<UserResponse>(`/api/admin/users/${id}/reactivate`);
    },
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: USER_KEYS.detail(id) });
      void queryClient.invalidateQueries({ queryKey: USER_KEYS.lists() });
    },
  });

  return {
    reactivateUser: mutation.mutate,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
