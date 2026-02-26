import { z } from 'zod';

export const accountTypeSchema = z.enum(['retail', 'restaurant', 'distributor']);
export type AccountType = z.infer<typeof accountTypeSchema>;

export const createContactInlineSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255).optional(),
  phone: z.string().min(1).max(50).optional(),
  title: z.string().min(1).max(100).optional(),
});

export const createAccountSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  accountType: accountTypeSchema,
  streetAddress: z.string().min(1).max(500),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(50),
  zipCode: z.string().min(1).max(20),
  territoryId: z.string().uuid(),
  parentAccountId: z.string().uuid().nullable().optional(),
  primaryContact: createContactInlineSchema,
  skipDuplicateCheck: z.boolean().optional().default(false),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  accountType: accountTypeSchema.optional(),
  streetAddress: z.string().min(1).max(500).optional(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().min(1).max(50).optional(),
  zipCode: z.string().min(1).max(20).optional(),
  territoryId: z.string().uuid().optional(),
  parentAccountId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export const accountResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  accountType: accountTypeSchema,
  streetAddress: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  territoryId: z.string().uuid(),
  parentAccountId: z.string().uuid().nullable(),
  healthScore: z.number().int().min(0).max(100).nullable(),
  healthScoreCalculatedAt: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AccountResponse = z.infer<typeof accountResponseSchema>;

export const accountListQuerySchema = z.object({
  search: z.string().min(3).optional(),
  territoryId: z.string().uuid().optional(),
  accountType: accountTypeSchema.optional(),
  healthScoreMin: z.coerce.number().int().min(0).max(100).optional(),
  healthScoreMax: z.coerce.number().int().min(0).max(100).optional(),
  parentAccountId: z.string().uuid().optional(),
  includeDeleted: z.coerce.boolean().optional().default(false),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.enum(['name', 'createdAt', 'healthScore', 'updatedAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type AccountListQuery = z.infer<typeof accountListQuerySchema>;

export const duplicateCheckQuerySchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  streetAddress: z.string().optional(),
});

export type DuplicateCheckQuery = z.infer<typeof duplicateCheckQuerySchema>;
