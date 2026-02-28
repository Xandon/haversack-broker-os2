import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// --- Meeting Brief ---

export interface MeetingBriefContact {
  name: string;
  title: string | null;
  last_interaction: string | null;
  interaction_type: string | null;
}

export interface OrderTrends {
  total_orders_12m: number;
  total_revenue_12m: number;
  average_order_value: number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data';
  top_products: Array<{ name: string; order_count: number; total_qty: number }>;
}

export interface MeetingBrief {
  key_contacts: MeetingBriefContact[];
  activity_summary: string;
  order_trends: OrderTrends;
  talking_points: string[];
  health_score: number | null;
  health_trend: 'improving' | 'declining' | 'stable' | 'unknown';
}

export interface MeetingBriefResponse {
  account_id: string;
  account_name: string;
  ai_generated: true;
  ai_label: string;
  brief: MeetingBrief;
  editable: true;
  generated_at: string;
}

export function useMeetingBrief(): ReturnType<
  typeof useMutation<MeetingBriefResponse, Error, { accountId: string }>
> {
  return useMutation<MeetingBriefResponse, Error, { accountId: string }>({
    mutationFn: async ({ accountId }) => {
      const response = await apiClient<MeetingBriefResponse>(
        '/api/ai/meeting-brief',
        {
          method: 'POST',
          body: JSON.stringify({ account_id: accountId }),
        },
      );
      return response;
    },
  });
}

// --- Email Draft ---

export type EmailPurpose =
  | 'follow_up'
  | 'introduction'
  | 'product_pitch'
  | 'meeting_request'
  | 'thank_you'
  | 'custom';

export type EmailTone = 'professional' | 'friendly' | 'urgent';

export interface EmailDraftInput {
  accountId: string;
  contactId: string;
  purpose: EmailPurpose;
  context?: string;
  productIds?: string[];
  tone?: EmailTone;
}

export interface EmailDraft {
  to_email: string;
  to_name: string;
  subject: string;
  body: string;
  suggested_send_time: string | null;
}

export interface EmailDraftResponse {
  ai_generated: true;
  ai_label: string;
  draft: EmailDraft;
  editable: true;
  generated_at: string;
}

export function useEmailDraft(): ReturnType<
  typeof useMutation<EmailDraftResponse, Error, EmailDraftInput>
> {
  return useMutation<EmailDraftResponse, Error, EmailDraftInput>({
    mutationFn: async (input) => {
      const response = await apiClient<EmailDraftResponse>(
        '/api/ai/email-draft',
        {
          method: 'POST',
          body: JSON.stringify({
            account_id: input.accountId,
            contact_id: input.contactId,
            purpose: input.purpose,
            context: input.context,
            product_ids: input.productIds,
            tone: input.tone,
          }),
        },
      );
      return response;
    },
  });
}

// --- Activity Summary ---

export interface ActivityBreakdown {
  visits: number;
  calls: number;
  emails: number;
  demos: number;
}

export interface ActivitySummary {
  period: string;
  total_activities: number;
  activity_breakdown: ActivityBreakdown;
  narrative: string;
  key_events: string[];
  engagement_assessment: string;
}

export interface ActivitySummaryResponse {
  account_id: string;
  account_name: string;
  ai_generated: true;
  ai_label: string;
  summary: ActivitySummary;
  editable: true;
  generated_at: string;
}

export function useActivitySummary(): ReturnType<
  typeof useMutation<
    ActivitySummaryResponse,
    Error,
    { accountId: string; periodMonths?: number }
  >
> {
  return useMutation<
    ActivitySummaryResponse,
    Error,
    { accountId: string; periodMonths?: number }
  >({
    mutationFn: async ({ accountId, periodMonths }) => {
      const response = await apiClient<ActivitySummaryResponse>(
        '/api/ai/activity-summary',
        {
          method: 'POST',
          body: JSON.stringify({
            account_id: accountId,
            period_months: periodMonths,
          }),
        },
      );
      return response;
    },
  });
}
