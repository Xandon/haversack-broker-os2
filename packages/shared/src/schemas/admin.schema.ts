import { z } from 'zod';

// ── Error Codes ──────────────────────────────────────────────────────────

export const ADMIN_ERROR_CODES = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_EMAIL_DUPLICATE: 'USER_EMAIL_DUPLICATE',
  USER_SELF_DEACTIVATION: 'USER_SELF_DEACTIVATION',
  USER_CONFLICT: 'USER_CONFLICT',
  IMPORT_NOT_FOUND: 'IMPORT_NOT_FOUND',
  IMPORT_FILE_TOO_LARGE: 'IMPORT_FILE_TOO_LARGE',
  IMPORT_INVALID_FORMAT: 'IMPORT_INVALID_FORMAT',
  IMPORT_ALREADY_PROCESSING: 'IMPORT_ALREADY_PROCESSING',
  IMPORT_NOT_READY: 'IMPORT_NOT_READY',
  QUALITY_SCORE_NOT_FOUND: 'QUALITY_SCORE_NOT_FOUND',
} as const;

export type AdminErrorCode = (typeof ADMIN_ERROR_CODES)[keyof typeof ADMIN_ERROR_CODES];

// ── User Management Schemas ──────────────────────────────────────────────

export const userRoleSchema = z.enum(['admin', 'manager', 'rep', 'logistics', 'viewer']);

export const createUserSchema = z.object({
  email: z.string().email().max(255),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: userRoleSchema,
  territoryIds: z.array(z.string().uuid()).default([]),
  temporaryPassword: z.string().min(8).max(128),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: userRoleSchema.optional(),
  territoryIds: z.array(z.string().uuid()).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const userListQuerySchema = z.object({
  role: userRoleSchema.optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  search: z.string().min(1).max(255).optional(),
  page: z
    .string()
    .default('1')
    .transform((val) => Math.max(1, parseInt(val, 10))),
  limit: z
    .string()
    .default('20')
    .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10)))),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>;

export const userDetailResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: userRoleSchema,
  isActive: z.boolean(),
  avatarUrl: z.string().nullable(),
  lastLoginAt: z.string().nullable(),
  territories: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
    }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserDetailResponse = z.infer<typeof userDetailResponseSchema>;

// ── Data Import Schemas ──────────────────────────────────────────────────

export const dataImportEntityTypeSchema = z.enum(['account', 'contact', 'product', 'order']);

export type DataImportEntityType = z.infer<typeof dataImportEntityTypeSchema>;

export const dataImportStatusSchema = z.enum([
  'pending',
  'validating',
  'previewed',
  'processing',
  'completed',
  'failed',
]);

export type DataImportStatus = z.infer<typeof dataImportStatusSchema>;

export const importUploadResponseSchema = z.object({
  id: z.string().uuid(),
  status: dataImportStatusSchema,
  entityType: dataImportEntityTypeSchema,
  filename: z.string(),
  totalRows: z.number().int(),
  validRows: z.number().int(),
  errorRows: z.number().int(),
  errors: z.array(
    z.object({
      row: z.number().int(),
      field: z.string(),
      error: z.string(),
    }),
  ),
  warnings: z.array(z.string()),
});

export type ImportUploadResponse = z.infer<typeof importUploadResponseSchema>;

export const importConfirmSchema = z.object({
  skipErrors: z.boolean().default(true),
});

export type ImportConfirmInput = z.infer<typeof importConfirmSchema>;

export const importHistoryQuerySchema = z.object({
  entityType: dataImportEntityTypeSchema.optional(),
  page: z
    .string()
    .default('1')
    .transform((val) => Math.max(1, parseInt(val, 10))),
  limit: z
    .string()
    .default('20')
    .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10)))),
});

export type ImportHistoryQuery = z.infer<typeof importHistoryQuerySchema>;

export const importDetailResponseSchema = z.object({
  id: z.string().uuid(),
  entityType: dataImportEntityTypeSchema,
  filename: z.string(),
  fileSize: z.number().int(),
  totalRows: z.number().int(),
  validRows: z.number().int(),
  errorRows: z.number().int(),
  createdRows: z.number().int(),
  updatedRows: z.number().int(),
  skippedRows: z.number().int(),
  status: dataImportStatusSchema,
  errorLog: z.unknown().nullable(),
  warnings: z.array(z.string()),
  createdBy: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ImportDetailResponse = z.infer<typeof importDetailResponseSchema>;

// ── Data Quality Schemas ─────────────────────────────────────────────────

export const dataQualityScoreResponseSchema = z.object({
  accountCompleteness: z.number(),
  contactEmailValidity: z.number(),
  productImages: z.number(),
  duplicateAccountCount: z.number().int(),
  staleAccountCount: z.number().int(),
  compositeScore: z.number(),
  calculatedAt: z.string(),
});

export type DataQualityScoreResponse = z.infer<typeof dataQualityScoreResponseSchema>;

export const qualityDrillDownMetricSchema = z.enum([
  'accountCompleteness',
  'contactEmailValidity',
  'productImages',
  'duplicateAccounts',
  'staleAccounts',
]);

export type QualityDrillDownMetric = z.infer<typeof qualityDrillDownMetricSchema>;

export const qualityDrillDownQuerySchema = z.object({
  metric: qualityDrillDownMetricSchema,
  page: z
    .string()
    .default('1')
    .transform((val) => Math.max(1, parseInt(val, 10))),
  limit: z
    .string()
    .default('50')
    .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10)))),
});

export type QualityDrillDownQuery = z.infer<typeof qualityDrillDownQuerySchema>;

// ── Layout of Truth Schemas ──────────────────────────────────────────────

export const layoutOfTruthFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean(),
  maxLength: z.number().int().optional(),
  allowedValues: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export type LayoutOfTruthField = z.infer<typeof layoutOfTruthFieldSchema>;

export const layoutOfTruthResponseSchema = z.object({
  entityType: dataImportEntityTypeSchema,
  fields: z.array(layoutOfTruthFieldSchema),
});

export type LayoutOfTruthResponse = z.infer<typeof layoutOfTruthResponseSchema>;
