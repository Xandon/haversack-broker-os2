import { z } from 'zod';

// ── Enums ───────────────────────────────────────────────────

export const reportEntityTypeSchema = z.enum([
  'ACCOUNT',
  'ORDER',
  'PRODUCT',
  'COMMISSION',
  'ACTIVITY',
]);
export type ReportEntityType = z.infer<typeof reportEntityTypeSchema>;

export const reportExportFormatSchema = z.enum(['csv', 'xlsx']);
export type ReportExportFormat = z.infer<typeof reportExportFormatSchema>;

// ── Report Filters ──────────────────────────────────────────

export const reportFiltersSchema = z.object({
  dateRange: z
    .object({
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .optional(),
  territoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  repId: z.string().uuid().optional(),
  status: z.string().optional(),
});
export type ReportFilters = z.infer<typeof reportFiltersSchema>;

// ── CRUD Schemas ────────────────────────────────────────────

export const createReportSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  description: z.string().max(1000).trim().optional(),
  entityType: reportEntityTypeSchema,
  filters: reportFiltersSchema.default({}),
  columns: z.array(z.string().min(1)).min(1),
  isShared: z.boolean().default(false),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const reportListQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ReportListQuery = z.infer<typeof reportListQuerySchema>;

export const reportResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  entityType: reportEntityTypeSchema,
  filters: reportFiltersSchema,
  columns: z.array(z.string()),
  isShared: z.boolean(),
  createdByName: z.string(),
  lastRunAt: z.string().nullable(),
  createdAt: z.string(),
});
export type ReportResponse = z.infer<typeof reportResponseSchema>;

// ── Execute Schema ──────────────────────────────────────────

export const executeReportSchema = z
  .object({
    reportId: z.string().uuid().optional(),
    entityType: reportEntityTypeSchema.optional(),
    filters: reportFiltersSchema.optional(),
    columns: z.array(z.string().min(1)).min(1).optional(),
    cursor: z.string().uuid().optional().nullable(),
    limit: z.number().int().min(1).max(200).default(50),
  })
  .refine(
    (data) => {
      if (!data.reportId) {
        return data.entityType !== undefined && data.columns !== undefined;
      }
      return true;
    },
    { message: 'entityType and columns are required when reportId is not provided' },
  );
export type ExecuteReportInput = z.infer<typeof executeReportSchema>;

// ── Export Schema ───────────────────────────────────────────

export const exportReportSchema = z
  .object({
    reportId: z.string().uuid().optional(),
    entityType: reportEntityTypeSchema.optional(),
    filters: reportFiltersSchema.optional(),
    columns: z.array(z.string().min(1)).min(1).optional(),
    format: reportExportFormatSchema,
  })
  .refine(
    (data) => {
      if (!data.reportId) {
        return data.entityType !== undefined && data.columns !== undefined;
      }
      return true;
    },
    { message: 'entityType and columns are required when reportId is not provided' },
  );
export type ExportReportInput = z.infer<typeof exportReportSchema>;

// ── Column Metadata ─────────────────────────────────────────

export const columnMetadataSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(['string', 'number', 'currency', 'date', 'boolean']),
});
export type ColumnMetadata = z.infer<typeof columnMetadataSchema>;

// ── Execute Response ────────────────────────────────────────

export const executeReportResponseSchema = z.object({
  data: z.array(z.record(z.unknown())),
  pagination: z.object({
    cursor: z.string().uuid().nullable(),
    hasMore: z.boolean(),
    total: z.number().int(),
  }),
  truncated: z.boolean(),
  columns: z.array(columnMetadataSchema),
});
export type ExecuteReportResponse = z.infer<typeof executeReportResponseSchema>;
