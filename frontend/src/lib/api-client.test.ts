import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, setTokens, clearTokens, getAccessToken, loadStoredRefreshToken, ApiClientError } from './api-client';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  clearTokens();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ApiClientError', () => {
  it('creates error with status and code', () => {
    const err = new ApiClientError('Not found', 404, 'NOT_FOUND');
    expect(err.message).toBe('Not found');
    expect(err.status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.name).toBe('ApiClientError');
  });
});

describe('token management', () => {
  it('stores and retrieves access token', () => {
    expect(getAccessToken()).toBeNull();
    setTokens('access123', 'refresh456');
    expect(getAccessToken()).toBe('access123');
  });

  it('clears tokens', () => {
    setTokens('access123', 'refresh456');
    clearTokens();
    expect(getAccessToken()).toBeNull();
  });

  it('loads stored refresh token from localStorage', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue('stored-refresh'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    loadStoredRefreshToken();
    // loadStoredRefreshToken reads from localStorage (internal state)
    expect(localStorage.getItem).toHaveBeenCalledWith('refreshToken');
  });
});

describe('apiClient', () => {
  it('makes GET request with correct URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    });

    const result = await apiClient<{ data: string }>('/api/test');
    expect(result).toEqual({ data: 'test' });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/test',
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
  });

  it('includes Authorization header when token is set', async () => {
    setTokens('mytoken', 'refresh');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: 'ok' }),
    });

    await apiClient('/api/test');
    const headers = mockFetch.mock.calls[0][1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer mytoken');
  });

  it('throws ApiClientError on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: 'Bad request', code: 'BAD_REQUEST' }),
    });

    await expect(apiClient('/api/test')).rejects.toThrow(ApiClientError);
  });

  it('handles non-JSON error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    });

    await expect(apiClient('/api/test')).rejects.toThrow('Request failed: 500');
  });

  it('attempts token refresh on 401', async () => {
    setTokens('expired', 'valid-refresh');

    // First call returns 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: 'Unauthorized' }),
    });

    // Refresh call succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ accessToken: 'new-access', refreshToken: 'new-refresh' }),
    });

    // Retry with new token succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: 'refreshed' }),
    });

    const result = await apiClient<{ data: string }>('/api/test');
    expect(result).toEqual({ data: 'refreshed' });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
