import { z } from 'zod';

export const pipelineStageSchema = z.enum([
  'prospect',
  'qualified',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
]);
export type PipelineStage = z.infer<typeof pipelineStageSchema>;

export const createOpportunitySchema = z.object({
  name: z.string().min(1).max(255).trim(),
  estimatedValue: z.number().min(0),
  expectedCloseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  stage: pipelineStageSchema,
  accountId: z.string().uuid(),
  repId: z.string().uuid().optional(),
  brandIds: z.array(z.string().uuid()).optional().default([]),
  probability: z.number().min(0).max(100).optional(),
});
export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;

export const updateOpportunitySchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  estimatedValue: z.number().min(0).optional(),
  expectedCloseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  repId: z.string().uuid().optional(),
  brandIds: z.array(z.string().uuid()).optional(),
});
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;

export const transitionOpportunitySchema = z.object({
  stage: pipelineStageSchema,
  probability: z.number().min(0).max(100).optional(),
  closeReason: z.string().min(1).max(2000).optional(),
});
export type TransitionOpportunityInput = z.infer<typeof transitionOpportunitySchema>;

export const opportunityListQuerySchema = z.object({
  stage: pipelineStageSchema.optional(),
  accountId: z.string().uuid().optional(),
  repId: z.string().uuid().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.enum(['name', 'estimatedValue', 'expectedCloseDate', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});
export type OpportunityListQuery = z.infer<typeof opportunityListQuerySchema>;

export const pipelineSummaryQuerySchema = z.object({
  repId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type PipelineSummaryQuery = z.infer<typeof pipelineSummaryQuerySchema>;

export const winLossQuerySchema = z.object({
  repId: z.string().uuid().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type WinLossQuery = z.infer<typeof winLossQuerySchema>;

export const opportunityResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  estimatedValue: z.number(),
  probability: z.number(),
  weightedValue: z.number(),
  expectedCloseDate: z.string(),
  stage: pipelineStageSchema,
  closeReason: z.string().nullable(),
  closedAt: z.string().nullable(),
  accountId: z.string().uuid(),
  accountName: z.string(),
  repId: z.string().uuid(),
  repName: z.string(),
  brands: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
  })),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type OpportunityResponse = z.infer<typeof opportunityResponseSchema>;
