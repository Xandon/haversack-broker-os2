/**
 * Zod validation schemas for User Management domain API contracts.
 * Matches Prisma User model with snake_case fields.
 * Used by both frontend and backend for input validation.
 * Implements FR-029 (user management) and FR-030 (session invalidation).
 */
import { z } from 'zod';

/**
 * User role enum matching Prisma UserRole.
 */
export const userRoleEnum = z.enum([
  'admin',
  'manager',
  'rep',
  'logistics',
  'viewer',
]);

/**
 * Schema for creating a new user (FR-029).
 */
export const createUserSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password must not exceed 128 characters'),
  role: userRoleEnum,
  territory_id: z.string().uuid('Invalid territory ID').optional(),
  avatar_url: z.string().url('Invalid avatar URL').optional(),
});

/**
 * Schema for updating an existing user (partial update) (FR-029).
 */
export const updateUserSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  role: userRoleEnum.optional(),
  territory_id: z.string().uuid().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
});

/**
 * Schema for listing users with filters.
 */
export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
  role: userRoleEnum.optional(),
  is_active: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  sort_by: z
    .enum(['first_name', 'last_name', 'email', 'role', 'created_at', 'last_login_at'])
    .default('last_name'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * Schema for deactivating a user (FR-030).
 */
export const deactivateUserSchema = z.object({
  reason: z.string().max(500).optional(),
});

/** Input type for creating a user */
export type CreateUserInput = z.infer<typeof createUserSchema>;

/** Input type for updating a user */
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/** Query parameters for listing users */
export type UserListQuery = z.infer<typeof userListQuerySchema>;

/** Input type for deactivating a user */
export type DeactivateUserInput = z.infer<typeof deactivateUserSchema>;
