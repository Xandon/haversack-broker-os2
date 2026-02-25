/**
 * Zod validation schemas for authentication endpoints.
 * Validates login, refresh, and register payloads.
 */
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must not exceed 255 characters')
    .transform((val) => val.toLowerCase()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters'),
  tenantId: z
    .string()
    .uuid('Invalid tenant ID'),
});

export const refreshSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required'),
});

export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must not exceed 255 characters')
    .transform((val) => val.toLowerCase()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one digit',
    ),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must not exceed 100 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must not exceed 100 characters'),
  role: z.enum(['admin', 'manager', 'rep', 'logistics', 'viewer']),
  tenantId: z
    .string()
    .uuid('Invalid tenant ID'),
  territoryId: z
    .string()
    .uuid('Invalid territory ID')
    .optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
