/**
 * Zod validation schemas for Activity domain API contracts.
 * Matches Prisma Activity model with snake_case fields.
 * Used by both frontend and backend for input validation.
 */
import { z } from 'zod';

/**
 * Activity type enum matching Prisma ActivityType.
 */
export const activityTypeEnum = z.enum([
  'visit',
  'call',
  'email',
  'demo',
  'sampling',
  'task',
  'note',
  'system',
]);

/**
 * Schema for creating a new activity.
 * Required: account_id, activity_type.
 * Optional: subject, notes, contact_id, occurred_at, duration_minutes, metadata.
 */
export const createActivitySchema = z.object({
  account_id: z.string().uuid('Invalid account ID'),
  activity_type: activityTypeEnum,
  subject: z
    .string()
    .max(255, 'Subject must not exceed 255 characters')
    .optional()
    .nullable(),
  notes: z.string().optional().nullable(),
  contact_id: z.string().uuid('Invalid contact ID').optional().nullable(),
  occurred_at: z.string().datetime({ offset: true }).optional(),
  duration_minutes: z.number().int().positive('Duration must be a positive integer').optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Schema for activity list query parameters.
 * Required: account_id. Optional: page, page_size, activity_type.
 */
export const activityListQuerySchema = z.object({
  account_id: z.string().uuid('Invalid account ID'),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  activity_type: activityTypeEnum.optional(),
});

/** Input type for creating an activity */
export type CreateActivityInput = z.infer<typeof createActivitySchema>;

/** Query parameters for listing activities */
export type ActivityListQuery = z.infer<typeof activityListQuerySchema>;
