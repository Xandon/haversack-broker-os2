'use client';

import type { CreateAccountInput, UpdateAccountInput } from '@haversack/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export interface Account {
  id: string;
  name: string;
  accountType: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
  email?: string;
  website?: string;
  territoryId: string;
  assignedRepId: string;
  parentAccountId?: string;
  healthScore?: number;
  notes?: string;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  territory?: { id: string; name: string };
  assignedRep?: { id: string; firstName: string; lastName: string };
  contacts?: Contact[];
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  isPrimary: boolean;
}

interface AccountListResponse {
  data: Account[];
  total: number;
  page: number;
  limit: number;
}

interface AccountResponse {
  data: Account;
}

export function useAccounts(params?: { page?: number; limit?: number; search?: string }) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const search = params?.search ?? '';

  return useQuery<AccountListResponse>({
    queryKey: ['accounts', { page, limit, search }],
    queryFn: () => {
      const searchParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
      });
      return apiClient.get(`/api/accounts?${searchParams}`);
    },
  });
}

export function useAccount(id: string) {
  return useQuery<AccountResponse>({
    queryKey: ['accounts', id],
    queryFn: () => apiClient.get(`/api/accounts/${id}`),
    enabled: !!id,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAccountInput) =>
      apiClient.post<AccountResponse>('/api/accounts', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useUpdateAccount(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAccountInput) =>
      apiClient.patch<AccountResponse>(`/api/accounts/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts', id] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
