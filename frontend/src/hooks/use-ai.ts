'use client';

import { useMutation } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export interface MeetingBrief {
  keyContacts: { name: string; title: string; notes: string }[];
  recentActivitySummary: string;
  orderTrends: string;
  suggestedTalkingPoints: string[];
  generatedAt: string;
}

export interface ActivitySummary {
  summary: string;
  totalActivities: number;
  period: string;
  generatedAt: string;
}

export interface EmailDraft {
  subject: string;
  body: string;
  generatedAt: string;
}

export function useGenerateMeetingBrief() {
  return useMutation<MeetingBrief, Error, { accountId: string }>({
    mutationFn: (params) => apiClient.post('/api/ai/meeting-brief', params),
  });
}

export function useGenerateActivitySummary() {
  return useMutation<
    ActivitySummary,
    Error,
    { accountId: string; period?: 'week' | 'month' | 'quarter' }
  >({
    mutationFn: (params) => apiClient.post('/api/ai/activity-summary', params),
  });
}

export function useGenerateEmailDraft() {
  return useMutation<EmailDraft, Error, { accountId: string; purpose: string }>({
    mutationFn: (params) => apiClient.post('/api/ai/email-draft', params),
  });
}
