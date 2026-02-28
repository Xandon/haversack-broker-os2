import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { useUnmatchedEmails, useLinkEmail } from './use-email-records';

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from '@/lib/api-client';

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('FR-051: useUnmatchedEmails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-051: fetches unmatched emails', async () => {
    const mockResponse = {
      data: [
        {
          id: 'em-1',
          subject: 'Re: Product Samples',
          recipientEmail: 'unknown@example.com',
          direction: 'outbound',
          status: 'sent',
          sentAt: '2026-02-28T10:00:00Z',
          isLinked: false,
          contactId: null,
          accountId: null,
        },
      ],
      pagination: { cursor: null, hasMore: false, total: 1 },
    };
    vi.mocked(apiClient).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useUnmatchedEmails(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient).toHaveBeenCalledWith('/api/email-records/unmatched');
    expect(result.current.data?.data).toHaveLength(1);
  });
});

describe('FR-051: useLinkEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-051: links email to contact', async () => {
    const mockResponse = {
      data: { id: 'em-1', contactId: 'contact-1', isLinked: true },
    };
    vi.mocked(apiClient).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useLinkEmail(), { wrapper: createWrapper() });

    result.current.mutate({ emailId: 'em-1', contactId: 'contact-1' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient).toHaveBeenCalledWith('/api/email-records/em-1/link', {
      method: 'PUT',
      body: JSON.stringify({ contactId: 'contact-1' }),
    });
  });
});
