'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface EmailRecord {
  id: string;
  tenantId: string;
  contactId: string | null;
  accountId: string | null;
  userId: string;
  subject: string;
  bodyPreview: string | null;
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  recipientEmail: string;
  openedAt: string | null;
  clickedAt: string | null;
  bouncedAt: string | null;
  sentAt: string;
  createdAt: string;
  isLinked: boolean;
}

export interface UnmatchedEmailsResponse {
  data: EmailRecord[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
  };
}

export interface LinkEmailResponse {
  data: EmailRecord;
}

export function useUnmatchedEmails(params: { cursor?: string; limit?: number } = {}): ReturnType<
  typeof useQuery<UnmatchedEmailsResponse>
> {
  const queryParams = new URLSearchParams();
  if (params.cursor) queryParams.set('cursor', params.cursor);
  if (params.limit) queryParams.set('limit', String(params.limit));
  const qs = queryParams.toString();

  return useQuery<UnmatchedEmailsResponse>({
    queryKey: ['email-records', 'unmatched', params.cursor, params.limit],
    queryFn: () =>
      apiClient<UnmatchedEmailsResponse>(
        `/api/email-records/unmatched${qs ? `?${qs}` : ''}`,
      ),
  });
}

export function useLinkEmail(): ReturnType<
  typeof useMutation<LinkEmailResponse, Error, { emailId: string; contactId: string }>
> {
  const queryClient = useQueryClient();

  return useMutation<LinkEmailResponse, Error, { emailId: string; contactId: string }>({
    mutationFn: async ({ emailId, contactId }) => {
      return apiClient<LinkEmailResponse>(`/api/email-records/${emailId}/link`, {
        method: 'PUT',
        body: JSON.stringify({ contactId }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['email-records', 'unmatched'] });
    },
  });
}
