import { describe, expect, it, vi, beforeEach } from 'vitest';

import { apiClient, ApiError } from './api-client';

describe('ApiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('FR-INFRA: GET request returns parsed JSON', async () => {
    const mockData = { data: { id: '1', name: 'Test' } };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    });

    const result = await apiClient.get('/api/test');
    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/test'),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('FR-INFRA: POST request sends body as JSON', async () => {
    const mockData = { data: { id: '1' } };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve(mockData),
    });

    const body = { name: 'Test' };
    await apiClient.post('/api/test', body);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/test'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
      }),
    );
  });

  it('FR-INFRA: throws ApiError on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' }),
    });

    await expect(apiClient.get('/api/missing')).rejects.toThrow(ApiError);
    await expect(apiClient.get('/api/missing')).rejects.toThrow('Not found');
  });

  it('FR-INFRA: DELETE request returns void on 204', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    });

    const result = await apiClient.delete('/api/test/1');
    expect(result).toBeUndefined();
  });

  it('FR-INFRA: includes auth token from localStorage', async () => {
    const mockStorage: Record<string, string> = { access_token: 'test-token-123' };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key: string) => mockStorage[key] ?? null,
    );

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiClient.get('/api/test');

    expect(fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token-123',
        }),
      }),
    );
  });
});
