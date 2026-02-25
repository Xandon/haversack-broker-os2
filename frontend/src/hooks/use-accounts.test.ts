import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

import {
  useAccounts,
  useAccount,
  useCreateAccount,
  useUpdateAccount,
  useCheckDuplicates,
} from '@/hooks/use-accounts';
import { apiClient } from '@/lib/api-client';

// -------------------------------------------------------------------
// Mocks
// -------------------------------------------------------------------

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    public status: number;
    public code: string;
    public requestId: string;
    constructor(status: number, body: { message: string; code: string; requestId: string }) {
      super(body.message);
      this.status = status;
      this.code = body.code;
      this.requestId = body.requestId;
    }
  },
}));

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe('T046: useAccounts hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAccounts', () => {
    it('FR-001: fetches account list with pagination', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            name: 'Portland Provisions',
            account_type: 'Store',
            address_line1: '123 Main St',
            city: 'Portland',
            state: 'OR',
            zip_code: '97201',
            tenant_id: 'tenant-1',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAccounts({ page: 1, limit: 20 }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.accounts).toHaveLength(1);
      expect(result.current.accounts[0]?.name).toBe('Portland Provisions');
      expect(result.current.meta?.total).toBe(1);
      expect(apiClient.get).toHaveBeenCalledWith('/api/accounts?page=1&limit=20');
    });

    it('FR-001: returns empty array when no accounts exist', async () => {
      const mockResponse = {
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useAccounts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.accounts).toEqual([]);
    });

    it('FR-001: handles API errors gracefully', async () => {
      vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAccounts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Network error');
    });

    it('FR-001: appends search filter to query string', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });

      const { result } = renderHook(() => useAccounts({ search: 'portland' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/accounts?search=portland');
    });
  });

  describe('useAccount', () => {
    it('FR-001: fetches a single account by ID', async () => {
      const mockAccount = {
        data: {
          id: 'acc-123',
          name: 'Cascade Cheese Co.',
          account_type: 'Distributor',
          address_line1: '456 Elm St',
          city: 'Seattle',
          state: 'WA',
          zip_code: '98101',
          tenant_id: 'tenant-1',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockAccount);

      const { result } = renderHook(() => useAccount('acc-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.account?.name).toBe('Cascade Cheese Co.');
      expect(apiClient.get).toHaveBeenCalledWith('/api/accounts/acc-123');
    });

    it('FR-001: does not fetch when id is empty', async () => {
      renderHook(() => useAccount(''), {
        wrapper: createWrapper(),
      });

      expect(apiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('useCreateAccount', () => {
    it('FR-001: creates an account via POST', async () => {
      const mockResponse = {
        data: { id: 'new-acc-1', name: 'New Bakery', account_type: 'Store' },
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCreateAccount(), {
        wrapper: createWrapper(),
      });

      result.current.createAccount({
        name: 'New Bakery',
        account_type: 'Store',
        address_line1: '789 Oak Ave',
        city: 'Portland',
        state: 'OR',
        zip_code: '97202',
        territory_id: 'territory-1',
        tenant_id: 'tenant-1',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/accounts', expect.objectContaining({
        name: 'New Bakery',
        account_type: 'Store',
      }));
    });

    it('FR-001: reports error on create failure', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Validation failed'));

      const { result } = renderHook(() => useCreateAccount(), {
        wrapper: createWrapper(),
      });

      result.current.createAccount({
        name: '',
        account_type: 'Store',
        address_line1: '789 Oak Ave',
        city: 'Portland',
        state: 'OR',
        zip_code: '97202',
        territory_id: 'territory-1',
        tenant_id: 'tenant-1',
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Validation failed');
    });
  });

  describe('useUpdateAccount', () => {
    it('FR-001: updates an account via PATCH', async () => {
      const mockResponse = {
        data: { id: 'acc-1', name: 'Updated Name', account_type: 'Restaurant' },
      };

      vi.mocked(apiClient.patch).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useUpdateAccount(), {
        wrapper: createWrapper(),
      });

      result.current.updateAccount({
        id: 'acc-1',
        payload: { name: 'Updated Name' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(apiClient.patch).toHaveBeenCalledWith('/api/accounts/acc-1', { name: 'Updated Name' });
    });
  });

  describe('useCheckDuplicates', () => {
    it('FR-001: checks for duplicate accounts', async () => {
      const mockResponse = {
        data: [
          {
            id: 'dup-1',
            name: 'Portland Provisions',
            confidence: 92,
            matchedFields: ['name'],
          },
        ],
      };

      vi.mocked(apiClient.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCheckDuplicates(), {
        wrapper: createWrapper(),
      });

      result.current.checkDuplicates({ name: 'Portland Prov', tenantId: 'tenant-1' });

      await waitFor(() => {
        expect(result.current.duplicates).toHaveLength(1);
      });

      expect(result.current.duplicates[0]?.name).toBe('Portland Provisions');
      expect(result.current.duplicates[0]?.confidence).toBe(92);
      expect(apiClient.post).toHaveBeenCalledWith('/api/accounts/check-duplicates', {
        name: 'Portland Prov',
        tenantId: 'tenant-1',
      });
    });

    it('FR-001: returns empty duplicates when none found', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: [] });

      const { result } = renderHook(() => useCheckDuplicates(), {
        wrapper: createWrapper(),
      });

      result.current.checkDuplicates({ name: 'Unique Name', tenantId: 'tenant-1' });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.duplicates).toEqual([]);
    });

    it('FR-001: resets duplicates', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: [{ id: '1', name: 'Dup', confidence: 80, matchedFields: ['name'] }],
      });

      const { result } = renderHook(() => useCheckDuplicates(), {
        wrapper: createWrapper(),
      });

      result.current.checkDuplicates({ name: 'test', tenantId: 'tenant-1' });

      await waitFor(() => {
        expect(result.current.duplicates).toHaveLength(1);
      });

      result.current.reset();

      await waitFor(() => {
        expect(result.current.duplicates).toEqual([]);
      });
    });
  });
});
