/**
 * Zod validation schemas for Data Import domain API contracts.
 * Implements FR-031 (CSV/XLSX import), FR-032 (50MB limit), FR-033 (data quality).
 */
import { z } from 'zod';

/**
 * Import entity type enum matching Prisma ImportEntityType.
 */
export const importEntityTypeEnum = z.enum([
  'account',
  'contact',
  'product',
  'order',
]);

/**
 * Import job status enum matching Prisma ImportJobStatus.
 */
export const importJobStatusEnum = z.enum([
  'uploaded',
  'validating',
  'preview',
  'importing',
  'completed',
  'failed',
]);

/**
 * Schema for import upload metadata (FR-031).
 * File handling is done at the route level; this validates the entity_type field.
 */
export const importUploadSchema = z.object({
  entity_type: importEntityTypeEnum,
});

/**
 * Schema for executing an import (FR-031).
 */
export const importExecuteSchema = z.object({
  import_valid_only: z.boolean().default(true),
});

/**
 * Schema for listing import jobs with filters.
 */
export const importListQuerySchema = z.object({
  entity_type: importEntityTypeEnum.optional(),
  status: importJobStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(20),
});

/**
 * Schema for data quality date range query (FR-033).
 */
export const dataQualityQuerySchema = z.object({
  date_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
  date_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .optional(),
});

/** Input type for import upload */
export type ImportUploadInput = z.infer<typeof importUploadSchema>;

/** Input type for import execution */
export type ImportExecuteInput = z.infer<typeof importExecuteSchema>;

/** Query parameters for listing imports */
export type ImportListQuery = z.infer<typeof importListQuerySchema>;

/** Query parameters for data quality */
export type DataQualityQuery = z.infer<typeof dataQualityQuerySchema>;
