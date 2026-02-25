'use client';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface ApiRequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

interface ApiErrorResponse {
  error: string;
  message: string;
  code: string;
  requestId: string;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly requestId: string;

  constructor(status: number, body: ApiErrorResponse) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.requestId = body.requestId;
  }
}

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      setAccessToken(null);
      return null;
    }

    const data = (await response.json()) as { accessToken: string };
    setAccessToken(data.accessToken);
    return data.accessToken;
  } catch {
    setAccessToken(null);
    return null;
  }
}

async function ensureValidToken(): Promise<string | null> {
  if (accessToken) {
    return accessToken;
  }

  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: ApiRequestOptions,
): Promise<T> {
  const token = await ensureValidToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
    credentials: 'include',
    signal: options?.signal,
  });

  if (response.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body != null ? JSON.stringify(body) : undefined,
        credentials: 'include',
        signal: options?.signal,
      });
    }
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({
      error: 'UNKNOWN_ERROR',
      message: response.statusText,
      code: 'UNKNOWN_ERROR',
      requestId: 'unknown',
    }))) as ApiErrorResponse;
    throw new ApiError(response.status, errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return request<T>('GET', path, undefined, options);
  },

  post<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return request<T>('POST', path, body, options);
  },

  put<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return request<T>('PUT', path, body, options);
  },

  patch<T>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return request<T>('PATCH', path, body, options);
  },

  delete<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return request<T>('DELETE', path, undefined, options);
  },
};
