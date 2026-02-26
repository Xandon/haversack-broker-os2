import { z } from 'zod';

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

export const tokenUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'rep', 'logistics', 'viewer']),
  firstName: z.string(),
  lastName: z.string(),
});

export type TokenUser = z.infer<typeof tokenUserSchema>;

export const tokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: tokenUserSchema,
});

export type TokenResponse = z.infer<typeof tokenResponseSchema>;

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least 1 lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least 1 number');
