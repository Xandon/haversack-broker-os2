import { z } from 'zod';

// ── Enums ────────────────────────────────────────────────────

export const commissionStatementStatusSchema = z.enum([
  'pending',
  'approved',
  'exported',
  'paid',
]);
export type CommissionStatementStatus = z.infer<typeof commissionStatementStatusSchema>;

export const commissionDisputeStatusSchema = z.enum(['open', 'resolved']);
export type CommissionDisputeStatus = z.infer<typeof commissionDisputeStatusSchema>;

export const commissionEntryTypeSchema = z.enum([
  'calculation',
  'reversal',
  'credit',
]);
export type CommissionEntryType = z.infer<typeof commissionEntryTypeSchema>;

// ── Volume Tier ──────────────────────────────────────────────

export const volumeTierSchema = z.object({
  minAmount: z.number().min(0),
  maxAmount: z.number().positive().nullable(),
  bonusRate: z.number().min(0).max(1),
});
export type VolumeTier = z.infer<typeof volumeTierSchema>;

// ── Commission Rule ──────────────────────────────────────────

export const createCommissionRuleSchema = z.object({
  brandId: z.string().uuid(),
  territoryId: z.string().uuid().nullable().optional(),
  baseRate: z.number().min(0).max(1),
  territoryModifier: z.number().min(0.5).max(2.0).default(1.0),
  volumeTiers: z.array(volumeTierSchema).min(1),
  effectiveDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  expiresAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
});
export type CreateCommissionRuleInput = z.infer<typeof createCommissionRuleSchema>;

export const updateCommissionRuleSchema = z.object({
  baseRate: z.number().min(0).max(1).optional(),
  territoryModifier: z.number().min(0.5).max(2.0).optional(),
  volumeTiers: z.array(volumeTierSchema).min(1).optional(),
  effectiveDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  expiresAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
});
export type UpdateCommissionRuleInput = z.infer<typeof updateCommissionRuleSchema>;

export const commissionRuleResponseSchema = z.object({
  id: z.string().uuid(),
  brandId: z.string().uuid(),
  brandName: z.string(),
  territoryId: z.string().uuid().nullable(),
  territoryName: z.string().nullable(),
  baseRate: z.number(),
  territoryModifier: z.number(),
  volumeTiers: z.array(volumeTierSchema),
  effectiveDate: z.string(),
  expiresAt: z.string().nullable(),
  isActive: z.boolean(),
  version: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CommissionRuleResponse = z.infer<typeof commissionRuleResponseSchema>;

export const commissionRuleListQuerySchema = z.object({
  brandId: z.string().uuid().optional(),
  territoryId: z.string().uuid().optional(),
  activeOnly: z.coerce.boolean().default(true),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type CommissionRuleListQuery = z.infer<typeof commissionRuleListQuerySchema>;

// ── Commission Entry ─────────────────────────────────────────

export const commissionEntryResponseSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  orderNumber: z.string(),
  orderLineItemId: z.string().uuid(),
  accountName: z.string(),
  brandName: z.string(),
  entryType: commissionEntryTypeSchema,
  baseRate: z.number(),
  territoryModifier: z.number(),
  volumeTierApplied: z.string(),
  effectiveRate: z.number(),
  lineItemTotal: z.number(),
  commissionAmount: z.number(),
  calculatedAt: z.string(),
  disputeStatus: commissionDisputeStatusSchema.nullable(),
});
export type CommissionEntryResponse = z.infer<typeof commissionEntryResponseSchema>;

// ── Commission Statement ─────────────────────────────────────

export const commissionStatementResponseSchema = z.object({
  id: z.string().uuid(),
  repId: z.string().uuid(),
  repName: z.string(),
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
  status: commissionStatementStatusSchema,
  totalEarned: z.number(),
  ytdTotal: z.number(),
  entries: z.array(commissionEntryResponseSchema).optional(),
  disputes: z.array(z.object({
    id: z.string().uuid(),
    commissionEntryId: z.string().uuid(),
    reason: z.string(),
    status: commissionDisputeStatusSchema,
    originalAmount: z.number(),
    adjustedAmount: z.number().nullable(),
  })).optional(),
  approvedBy: z.string().uuid().nullable(),
  approvedAt: z.string().nullable(),
  exportedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type CommissionStatementResponse = z.infer<typeof commissionStatementResponseSchema>;

export const listCommissionStatementsSchema = z.object({
  repId: z.string().uuid().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).optional(),
  status: commissionStatementStatusSchema.optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListCommissionStatementsQuery = z.infer<typeof listCommissionStatementsSchema>;

// ── Commission Dispute ───────────────────────────────────────

export const createDisputeSchema = z.object({
  reason: z.string().min(1).max(1000),
});
export type CreateDisputeInput = z.infer<typeof createDisputeSchema>;

export const resolveDisputeSchema = z.object({
  adjustedAmount: z.number().min(0).nullable().optional(),
  resolutionNotes: z.string().min(1).max(1000),
});
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;

export const commissionDisputeResponseSchema = z.object({
  id: z.string().uuid(),
  statementId: z.string().uuid(),
  commissionEntryId: z.string().uuid(),
  filedBy: z.string().uuid(),
  reason: z.string(),
  status: commissionDisputeStatusSchema,
  originalAmount: z.number(),
  adjustedAmount: z.number().nullable(),
  resolvedBy: z.string().uuid().nullable(),
  resolvedAt: z.string().nullable(),
  resolutionNotes: z.string().nullable(),
  createdAt: z.string(),
});
export type CommissionDisputeResponse = z.infer<typeof commissionDisputeResponseSchema>;

// ── Commission Export ────────────────────────────────────────

export const triggerExportSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
  forceReExport: z.boolean().default(false),
});
export type TriggerExportInput = z.infer<typeof triggerExportSchema>;

export const generateStatementsSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
});
export type GenerateStatementsInput = z.infer<typeof generateStatementsSchema>;

export const commissionExportResponseSchema = z.object({
  id: z.string().uuid(),
  referenceId: z.string(),
  month: z.number().int(),
  year: z.number().int(),
  statementsIncluded: z.number().int(),
  statementsSkipped: z.number().int(),
  totalAmount: z.number(),
  format: z.string(),
  createdAt: z.string(),
});
export type CommissionExportResponse = z.infer<typeof commissionExportResponseSchema>;
