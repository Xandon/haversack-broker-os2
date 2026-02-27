const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface ApiError {
  error: string;
  message: string;
  code: string;
  requestId?: string;
}

export class ApiClientError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshPromise: Promise<void> | null = null;

export function setTokens(access: string, refresh: string): void {
  accessToken = access;
  refreshToken = refresh;
  if (typeof window !== 'undefined') {
    localStorage.setItem('refreshToken', refresh);
  }
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('refreshToken');
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function loadStoredRefreshToken(): void {
  if (typeof window !== 'undefined') {
    refreshToken = localStorage.getItem('refreshToken');
  }
}

async function refreshAccessToken(): Promise<void> {
  if (!refreshToken) {
    throw new ApiClientError('No refresh token', 401, 'AUTH_NO_REFRESH_TOKEN');
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearTokens();
    throw new ApiClientError('Session expired', 401, 'AUTH_SESSION_EXPIRED');
  }

  const data = (await response.json()) as { accessToken: string; refreshToken: string };
  setTokens(data.accessToken, data.refreshToken);
}

export async function apiClient<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Handle 401 — attempt token refresh once
  if (response.status === 401 && refreshToken) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }

    try {
      await refreshPromise;
    } catch {
      throw new ApiClientError('Session expired', 401, 'AUTH_SESSION_EXPIRED');
    }

    // Retry with new token
    headers.set('Authorization', `Bearer ${accessToken}`);
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  }

  if (!response.ok) {
    let apiError: ApiError | null = null;
    try {
      apiError = (await response.json()) as ApiError;
    } catch {
      // Response may not be JSON
    }
    throw new ApiClientError(
      apiError?.message ?? `Request failed: ${response.status}`,
      response.status,
      apiError?.code ?? 'UNKNOWN_ERROR',
    );
  }

  return response.json() as Promise<T>;
}
