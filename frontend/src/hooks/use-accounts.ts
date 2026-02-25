'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface Account {
  id: string;
  name: string;
  account_type: 'Store' | 'Restaurant' | 'Distributor' | 'Other';
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip_code: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  territory_id: string;
  assigned_rep_id: string | null;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface AccountListFilters {
  page?: number;
  limit?: number;
  search?: string;
  territory_id?: string;
  account_type?: string;
}

interface AccountListResponse {
  data: Account[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface AccountResponse {
  data: Account;
}

export interface CreateAccountPayload {
  name: string;
  account_type: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip_code: string;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
  territory_id: string;
  assigned_rep_id?: string;
  tenant_id: string;
}

export interface UpdateAccountPayload {
  name?: string;
  account_type?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
  territory_id?: string;
  assigned_rep_id?: string;
}

export interface DuplicateMatch {
  id: string;
  name: string;
  confidence: number;
  matchedFields: string[];
}

interface CheckDuplicatesPayload {
  name: string;
  tenantId: string;
}

interface CheckDuplicatesResponse {
  data: DuplicateMatch[];
}

// -------------------------------------------------------------------
// Query keys
// -------------------------------------------------------------------

const ACCOUNT_KEYS = {
  all: ['accounts'] as const,
  lists: () => [...ACCOUNT_KEYS.all, 'list'] as const,
  list: (filters: AccountListFilters) => [...ACCOUNT_KEYS.lists(), filters] as const,
  details: () => [...ACCOUNT_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ACCOUNT_KEYS.details(), id] as const,
} as const;

// -------------------------------------------------------------------
// useAccounts — paginated account list
// -------------------------------------------------------------------

interface UseAccountsResult {
  accounts: Account[];
  meta: AccountListResponse['meta'] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useAccounts(filters: AccountListFilters = {}): UseAccountsResult {
  const query = useQuery<AccountListResponse, Error>({
    queryKey: ACCOUNT_KEYS.list(filters),
    queryFn: async (): Promise<AccountListResponse> => {
      const params = new URLSearchParams();
      if (filters.page != null) params.set('page', String(filters.page));
      if (filters.limit != null) params.set('limit', String(filters.limit));
      if (filters.search) params.set('search', filters.search);
      if (filters.territory_id) params.set('territory_id', filters.territory_id);
      if (filters.account_type) params.set('account_type', filters.account_type);

      const queryString = params.toString();
      const path = queryString ? `/api/accounts?${queryString}` : '/api/accounts';
      return apiClient.get<AccountListResponse>(path);
    },
  });

  return {
    accounts: query.data?.data ?? [],
    meta: query.data?.meta,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// -------------------------------------------------------------------
// useAccount — single account by ID
// -------------------------------------------------------------------

interface UseAccountResult {
  account: Account | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useAccount(id: string): UseAccountResult {
  const query = useQuery<AccountResponse, Error>({
    queryKey: ACCOUNT_KEYS.detail(id),
    queryFn: async (): Promise<AccountResponse> => {
      return apiClient.get<AccountResponse>(`/api/accounts/${id}`);
    },
    enabled: id.length > 0,
  });

  return {
    account: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// -------------------------------------------------------------------
// useCreateAccount — mutation for creating an account
// -------------------------------------------------------------------

interface UseCreateAccountResult {
  createAccount: (payload: CreateAccountPayload) => void;
  createAccountAsync: (payload: CreateAccountPayload) => Promise<AccountResponse>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
  data: AccountResponse | undefined;
}

export function useCreateAccount(): UseCreateAccountResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<AccountResponse, Error, CreateAccountPayload>({
    mutationFn: async (payload: CreateAccountPayload): Promise<AccountResponse> => {
      return apiClient.post<AccountResponse>('/api/accounts', payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNT_KEYS.all });
    },
  });

  return {
    createAccount: mutation.mutate,
    createAccountAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
}

// -------------------------------------------------------------------
// useUpdateAccount — mutation for updating an account
// -------------------------------------------------------------------

interface UpdateAccountArgs {
  id: string;
  payload: UpdateAccountPayload;
}

interface UseUpdateAccountResult {
  updateAccount: (args: UpdateAccountArgs) => void;
  updateAccountAsync: (args: UpdateAccountArgs) => Promise<AccountResponse>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
}

export function useUpdateAccount(): UseUpdateAccountResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<AccountResponse, Error, UpdateAccountArgs>({
    mutationFn: async ({ id, payload }: UpdateAccountArgs): Promise<AccountResponse> => {
      return apiClient.patch<AccountResponse>(`/api/accounts/${id}`, payload);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNT_KEYS.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: ACCOUNT_KEYS.lists() });
    },
  });

  return {
    updateAccount: mutation.mutate,
    updateAccountAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}

// -------------------------------------------------------------------
// useCheckDuplicates — mutation for checking duplicate accounts
// -------------------------------------------------------------------

interface UseCheckDuplicatesResult {
  checkDuplicates: (payload: CheckDuplicatesPayload) => void;
  checkDuplicatesAsync: (payload: CheckDuplicatesPayload) => Promise<DuplicateMatch[]>;
  duplicates: DuplicateMatch[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

export function useCheckDuplicates(): UseCheckDuplicatesResult {
  const mutation = useMutation<CheckDuplicatesResponse, Error, CheckDuplicatesPayload>({
    mutationFn: async (payload: CheckDuplicatesPayload): Promise<CheckDuplicatesResponse> => {
      return apiClient.post<CheckDuplicatesResponse>('/api/accounts/check-duplicates', payload);
    },
  });

  return {
    checkDuplicates: mutation.mutate,
    checkDuplicatesAsync: async (
      payload: CheckDuplicatesPayload,
    ): Promise<DuplicateMatch[]> => {
      const response = await mutation.mutateAsync(payload);
      return response.data;
    },
    duplicates: mutation.data?.data ?? [],
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
  };
}
