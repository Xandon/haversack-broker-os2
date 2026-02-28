'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export type EmailDirection = 'inbound' | 'outbound';
export type EngagementStatus =
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'unsubscribed';

export interface EmailRecord {
  id: string;
  direction: EmailDirection;
  subject: string | null;
  bodyPreview: string | null;
  fromAddress: string;
  toAddresses: string[];
  ccAddresses: string[];
  engagementStatus: EngagementStatus;
  openedAt: string | null;
  clickedAt: string | null;
  bouncedAt: string | null;
  isMatched: boolean;
  createdAt: string;
  account: { id: string; name: string } | null;
  contact: { id: string; firstName: string; lastName: string } | null;
}

export interface EmailListResult {
  data: EmailRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
  category: string;
  mergeFields: string[];
  isActive: boolean;
}

export function useEmails(accountId?: string, page: number = 1) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  if (accountId) params.set('accountId', accountId);

  return useQuery<EmailListResult>({
    queryKey: ['emails', accountId, page],
    queryFn: () => apiClient.get(`/api/emails?${params.toString()}`),
  });
}

export function useUnmatchedEmails(page: number = 1) {
  return useQuery<EmailListResult>({
    queryKey: ['emails', 'unmatched', page],
    queryFn: () => apiClient.get(`/api/emails/unmatched?page=${page}`),
  });
}

export function useSendEmail() {
  const queryClient = useQueryClient();
  return useMutation<
    EmailRecord,
    Error,
    {
      accountId?: string;
      contactId?: string;
      toAddresses: string[];
      ccAddresses?: string[];
      subject: string;
      bodyPreview: string;
    }
  >({
    mutationFn: (params) => apiClient.post('/api/emails/send', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });
}

export function useMatchEmail() {
  const queryClient = useQueryClient();
  return useMutation<
    { id: string; isMatched: boolean },
    Error,
    { emailId: string; accountId: string; contactId?: string }
  >({
    mutationFn: ({ emailId, ...body }) => apiClient.patch(`/api/emails/${emailId}/match`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });
}

export function useEmailTemplates() {
  return useQuery<{ data: EmailTemplate[]; total: number }>({
    queryKey: ['emails', 'templates'],
    queryFn: () => apiClient.get('/api/emails/templates'),
  });
}
