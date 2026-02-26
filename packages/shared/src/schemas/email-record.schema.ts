import { z } from 'zod';

export const emailDirectionSchema = z.enum(['inbound', 'outbound']);
export type EmailDirection = z.infer<typeof emailDirectionSchema>;

export const emailStatusSchema = z.enum([
  'sent',
  'delivered',
  'opened',
  'clicked',
  'bounced',
  'failed',
]);
export type EmailStatus = z.infer<typeof emailStatusSchema>;

export const createEmailRecordSchema = z.object({
  subject: z.string().min(1).max(500),
  bodyPreview: z.string().max(500).optional(),
  direction: emailDirectionSchema,
  recipientEmail: z.string().email().max(255),
  sentAt: z.string().datetime(),
});

export type CreateEmailRecordInput = z.infer<typeof createEmailRecordSchema>;

export const emailRecordResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  contactId: z.string().uuid().nullable(),
  accountId: z.string().uuid().nullable(),
  userId: z.string().uuid(),
  subject: z.string(),
  bodyPreview: z.string().nullable(),
  direction: emailDirectionSchema,
  status: emailStatusSchema,
  recipientEmail: z.string(),
  openedAt: z.string().nullable(),
  clickedAt: z.string().nullable(),
  bouncedAt: z.string().nullable(),
  sentAt: z.string(),
  createdAt: z.string(),
  isLinked: z.boolean(),
});

export type EmailRecordResponse = z.infer<typeof emailRecordResponseSchema>;

export const emailEngagementSchema = z.object({
  event: z.enum(['opened', 'clicked', 'bounced']),
  occurredAt: z.string().datetime(),
});

export type EmailEngagementInput = z.infer<typeof emailEngagementSchema>;

export const unmatchedEmailQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type UnmatchedEmailQuery = z.infer<typeof unmatchedEmailQuerySchema>;
