/**
 * Zod validation schemas for Account domain API contracts.
 * Matches Prisma Account model with snake_case fields.
 * Used by both frontend and backend for input validation.
 */
import { z } from 'zod';

/**
 * Account type enum matching Prisma AccountType.
 */
export const accountTypeEnum = z.enum(['store', 'restaurant', 'distributor', 'other']);

/**
 * Schema for creating a new account.
 * All required fields match the Prisma Account model constraints.
 */
export const createAccountSchema = z.object({
  name: z
    .string()
    .min(1, 'Account name is required')
    .max(255, 'Account name must not exceed 255 characters'),
  account_type: accountTypeEnum,
  address_line1: z
    .string()
    .min(1, 'Address line 1 is required')
    .max(255, 'Address line 1 must not exceed 255 characters'),
  address_line2: z
    .string()
    .max(255, 'Address line 2 must not exceed 255 characters')
    .optional()
    .nullable(),
  city: z
    .string()
    .min(1, 'City is required')
    .max(100, 'City must not exceed 100 characters'),
  state: z
    .string()
    .min(1, 'State is required')
    .max(50, 'State must not exceed 50 characters'),
  zip_code: z
    .string()
    .min(1, 'Zip code is required')
    .max(20, 'Zip code must not exceed 20 characters'),
  phone: z
    .string()
    .max(30, 'Phone must not exceed 30 characters')
    .optional()
    .nullable(),
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must not exceed 255 characters')
    .optional()
    .nullable(),
  website: z
    .string()
    .max(500, 'Website must not exceed 500 characters')
    .optional()
    .nullable(),
  territory_id: z.string().uuid('Invalid territory ID'),
  assigned_rep_id: z.string().uuid('Invalid assigned rep ID'),
  parent_account_id: z
    .string()
    .uuid('Invalid parent account ID')
    .optional()
    .nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
});

/**
 * Schema for updating an existing account.
 * All fields are optional (partial update).
 */
export const updateAccountSchema = createAccountSchema.partial();

/**
 * Schema describing the full account response shape.
 */
export const accountResponseSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string(),
  account_type: accountTypeEnum,
  address_line1: z.string(),
  address_line2: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  zip_code: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  website: z.string().nullable(),
  territory_id: z.string().uuid(),
  assigned_rep_id: z.string().uuid(),
  parent_account_id: z.string().uuid().nullable(),
  health_score: z.number().nullable(),
  health_score_calculated_at: z.string().nullable(),
  notes: z.string().nullable(),
  tags: z.array(z.string()),
  metadata: z.record(z.unknown()),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});

/**
 * Schema for account list query parameters.
 */
export const accountListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  territory_id: z.string().uuid().optional(),
  account_type: accountTypeEnum.optional(),
  search: z.string().optional(),
  is_active: z.coerce.boolean().optional(),
});

/** Input type for creating an account */
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

/** Input type for updating an account */
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

/** Response type for a single account */
export type AccountResponse = z.infer<typeof accountResponseSchema>;

/** Query parameters for listing accounts */
export type AccountListQuery = z.infer<typeof accountListQuerySchema>;
