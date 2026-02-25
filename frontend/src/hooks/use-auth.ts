'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { apiClient, setAccessToken } from '@/lib/api-client';
import type { AuthUser } from '@/providers/auth-provider';

// -------------------------------------------------------------------
// API response shapes
// -------------------------------------------------------------------

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

interface RefreshResponse {
  accessToken: string;
  user: AuthUser;
}

interface LoginCredentials {
  email: string;
  password: string;
}

// -------------------------------------------------------------------
// Query keys
// -------------------------------------------------------------------

const AUTH_KEYS = {
  session: ['auth', 'session'] as const,
} as const;

// -------------------------------------------------------------------
// useLogin — mutation for email/password login
// -------------------------------------------------------------------

interface UseLoginResult {
  login: (credentials: LoginCredentials) => void;
  loginAsync: (credentials: LoginCredentials) => Promise<LoginResponse>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useLogin(): UseLoginResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<LoginResponse, Error, LoginCredentials>({
    mutationFn: async (credentials: LoginCredentials): Promise<LoginResponse> => {
      return apiClient.post<LoginResponse>('/api/auth/login', credentials);
    },
    onSuccess: (data: LoginResponse) => {
      setAccessToken(data.accessToken);
      queryClient.setQueryData(AUTH_KEYS.session, data.user);
    },
  });

  return {
    login: mutation.mutate,
    loginAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

// -------------------------------------------------------------------
// useLogout — mutation for logging out
// -------------------------------------------------------------------

interface UseLogoutResult {
  logout: () => void;
  logoutAsync: () => Promise<void>;
  isLoading: boolean;
}

export function useLogout(): UseLogoutResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<void, Error, void>({
    mutationFn: async (): Promise<void> => {
      await apiClient.post('/api/auth/logout');
    },
    onSettled: () => {
      setAccessToken(null);
      queryClient.setQueryData(AUTH_KEYS.session, null);
      queryClient.clear();
    },
  });

  return {
    logout: mutation.mutate,
    logoutAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}

// -------------------------------------------------------------------
// useRefreshToken — query that silently refreshes the access token
// -------------------------------------------------------------------

interface UseRefreshTokenResult {
  user: AuthUser | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useRefreshToken(): UseRefreshTokenResult {
  const queryClient = useQueryClient();

  const query = useQuery<AuthUser | null, Error>({
    queryKey: AUTH_KEYS.session,
    queryFn: async (): Promise<AuthUser | null> => {
      try {
        const data = await apiClient.post<RefreshResponse>('/api/auth/refresh');
        setAccessToken(data.accessToken);
        return data.user;
      } catch {
        setAccessToken(null);
        return null;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 13 * 60 * 1000, // Refresh before 15-min token expiry
    refetchOnWindowFocus: true,
    retry: false,
  });

  const refetch = useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey: AUTH_KEYS.session });
  }, [queryClient]);

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch,
  };
}
