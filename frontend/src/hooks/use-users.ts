import type { CreateUserInput, UpdateUserInput } from '@haversack/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../lib/api-client';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  territoryId: string | null;
  territory?: { id: string; name: string } | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export function useUsers(includeInactive = false) {
  return useQuery<{ data: User[] }>({
    queryKey: ['users', { includeInactive }],
    queryFn: () => apiClient.get(`/api/users${includeInactive ? '?includeInactive=true' : ''}`),
  });
}

export function useUser(id: string) {
  return useQuery<{ data: User }>({
    queryKey: ['users', id],
    queryFn: () => apiClient.get(`/api/users/${id}`),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => apiClient.post('/api/users', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateUserInput & { id: string }) =>
      apiClient.patch(`/api/users/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/users/${id}/deactivate`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
