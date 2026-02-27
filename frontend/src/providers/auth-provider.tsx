'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  apiClient,
  setTokens,
  clearTokens,
  loadStoredRefreshToken,
  getAccessToken,
} from '@/lib/api-client';

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'rep' | 'logistics' | 'viewer';
  firstName: string;
  lastName: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export function AuthProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // On mount, try to restore session from stored refresh token
  useEffect(() => {
    loadStoredRefreshToken();

    async function restoreSession(): Promise<void> {
      try {
        // If we have a stored refresh token, try to get a new access token
        const data = await apiClient<{ data: AuthUser }>('/api/auth/me');
        setState({ user: data.data, isLoading: false, isAuthenticated: true });
      } catch {
        clearTokens();
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    }

    if (getAccessToken() !== null) {
      void restoreSession();
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const response = await apiClient<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    setTokens(response.accessToken, response.refreshToken);
    setState({ user: response.user, isLoading: false, isAuthenticated: true });
  }, []);

  const logout = useCallback((): void => {
    clearTokens();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
    }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
