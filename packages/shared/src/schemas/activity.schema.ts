import { z } from 'zod';

export const activityTypeSchema = z.enum(['visit', 'call', 'email', 'demo', 'sampling']);
export type ActivityType = z.infer<typeof activityTypeSchema>;

export const demoOutcomeSchema = z.enum(['positive', 'neutral', 'negative']);
export type DemoOutcome = z.infer<typeof demoOutcomeSchema>;

export const createDemoSchema = z.object({
  productId: z.string().uuid(),
  quantitySampled: z.number().int().min(0).optional(),
  buyerFeedback: z.string().max(10000).optional(),
  outcome: demoOutcomeSchema.optional(),
});

export type CreateDemoInput = z.infer<typeof createDemoSchema>;

export const createActivitySchema = z
  .object({
    accountId: z.string().uuid(),
    type: activityTypeSchema,
    notes: z.string().max(10000).optional(),
    occurredAt: z.string().datetime(),
    durationMinutes: z.number().int().min(1).max(1440).optional(),
    demos: z.array(createDemoSchema).optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'demo') {
        return data.demos !== undefined && data.demos.length > 0;
      }
      return true;
    },
    { message: 'Demo activities require at least one product', path: ['demos'] },
  );

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

export const updateActivitySchema = z.object({
  accountId: z.string().uuid().optional(),
  type: activityTypeSchema.optional(),
  notes: z.string().max(10000).nullable().optional(),
  occurredAt: z.string().datetime().optional(),
  durationMinutes: z.number().int().min(1).max(1440).nullable().optional(),
  demos: z.array(createDemoSchema).optional(),
});

export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;

export const activityResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  accountId: z.string().uuid(),
  userId: z.string().uuid(),
  type: activityTypeSchema,
  notes: z.string().nullable(),
  occurredAt: z.string(),
  durationMinutes: z.number().nullable(),
  version: z.number(),
  demos: z.array(
    z.object({
      id: z.string().uuid(),
      productId: z.string().uuid(),
      quantitySampled: z.number().nullable(),
      buyerFeedback: z.string().nullable(),
      outcome: z.string().nullable(),
    }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ActivityResponse = z.infer<typeof activityResponseSchema>;

export const activityListQuerySchema = z.object({
  type: activityTypeSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type ActivityListQuery = z.infer<typeof activityListQuerySchema>;

export const activityMetricsQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  groupBy: z.enum(['rep', 'account', 'type']).optional().default('rep'),
});

export type ActivityMetricsQuery = z.infer<typeof activityMetricsQuerySchema>;

export const timelineQuerySchema = z.object({
  types: z.string().optional(),
  activityType: activityTypeSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type TimelineQuery = z.infer<typeof timelineQuerySchema>;
