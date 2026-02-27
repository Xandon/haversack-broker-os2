import { z } from 'zod';

// ── Error Codes ──────────────────────────────────────────────────────────

export const AI_ERROR_CODES = {
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  AI_RATE_LIMITED: 'AI_RATE_LIMITED',
  CONTACT_NO_EMAIL: 'CONTACT_NO_EMAIL',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  CONTACT_NOT_FOUND: 'CONTACT_NOT_FOUND',
} as const;

export type AIErrorCode = (typeof AI_ERROR_CODES)[keyof typeof AI_ERROR_CODES];

// ── Email Draft Purpose ──────────────────────────────────────────────────

export const emailDraftPurposeSchema = z.enum([
  'follow_up',
  'introduction',
  'product_pitch',
  'meeting_request',
  'thank_you',
  'custom',
]);

export type EmailDraftPurpose = z.infer<typeof emailDraftPurposeSchema>;

// ── Email Draft Tone ─────────────────────────────────────────────────────

export const emailDraftToneSchema = z.enum([
  'professional',
  'friendly',
  'urgent',
]);

export type EmailDraftTone = z.infer<typeof emailDraftToneSchema>;

// ── Request Schemas ──────────────────────────────────────────────────────

export const meetingBriefRequestSchema = z.object({
  account_id: z.string().uuid(),
});

export type MeetingBriefRequest = z.infer<typeof meetingBriefRequestSchema>;

export const emailDraftRequestSchema = z.object({
  account_id: z.string().uuid(),
  contact_id: z.string().uuid(),
  purpose: emailDraftPurposeSchema,
  context: z.string().max(1000).optional(),
  product_ids: z.array(z.string().uuid()).optional(),
  tone: emailDraftToneSchema.default('professional'),
});

export type EmailDraftRequest = z.infer<typeof emailDraftRequestSchema>;

export const activitySummaryRequestSchema = z.object({
  account_id: z.string().uuid(),
  period_months: z.number().int().min(1).max(24).default(6),
});

export type ActivitySummaryRequest = z.infer<typeof activitySummaryRequestSchema>;

// ── Response Schemas ─────────────────────────────────────────────────────

export const meetingBriefContactSchema = z.object({
  name: z.string(),
  title: z.string().nullable(),
  last_interaction: z.string().nullable(),
  interaction_type: z.string().nullable(),
});

export const orderTrendsSchema = z.object({
  total_orders_12m: z.number(),
  total_revenue_12m: z.number(),
  average_order_value: z.number(),
  trend: z.enum(['increasing', 'decreasing', 'stable', 'insufficient_data']),
  top_products: z.array(
    z.object({
      name: z.string(),
      order_count: z.number(),
      total_qty: z.number(),
    }),
  ),
});

export const meetingBriefDataSchema = z.object({
  key_contacts: z.array(meetingBriefContactSchema),
  activity_summary: z.string(),
  order_trends: orderTrendsSchema,
  talking_points: z.array(z.string()),
  health_score: z.number().nullable(),
  health_trend: z.enum(['improving', 'declining', 'stable', 'unknown']),
});

export const meetingBriefResponseSchema = z.object({
  account_id: z.string(),
  account_name: z.string(),
  ai_generated: z.literal(true),
  ai_label: z.literal('AI-Generated'),
  brief: meetingBriefDataSchema,
  editable: z.literal(true),
  generated_at: z.string(),
});

export type MeetingBriefResponse = z.infer<typeof meetingBriefResponseSchema>;

export const emailDraftDataSchema = z.object({
  to_email: z.string(),
  to_name: z.string(),
  subject: z.string(),
  body: z.string(),
  suggested_send_time: z.string().nullable(),
});

export const emailDraftResponseSchema = z.object({
  ai_generated: z.literal(true),
  ai_label: z.literal('AI-Generated'),
  draft: emailDraftDataSchema,
  editable: z.literal(true),
  generated_at: z.string(),
});

export type EmailDraftResponse = z.infer<typeof emailDraftResponseSchema>;

export const activityBreakdownSchema = z.object({
  visits: z.number(),
  calls: z.number(),
  emails: z.number(),
  demos: z.number(),
});

export const activitySummaryDataSchema = z.object({
  period: z.string(),
  total_activities: z.number(),
  activity_breakdown: activityBreakdownSchema,
  narrative: z.string(),
  key_events: z.array(z.string()),
  engagement_assessment: z.string(),
});

export const activitySummaryResponseSchema = z.object({
  account_id: z.string(),
  account_name: z.string(),
  ai_generated: z.literal(true),
  ai_label: z.literal('AI-Generated'),
  summary: activitySummaryDataSchema,
  editable: z.literal(true),
  generated_at: z.string(),
});

export type ActivitySummaryResponse = z.infer<typeof activitySummaryResponseSchema>;
