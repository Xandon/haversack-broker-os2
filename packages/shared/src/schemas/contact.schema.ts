import { z } from 'zod';

export const createContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255).optional(),
  phone: z.string().min(1).max(50).optional(),
  title: z.string().min(1).max(100).optional(),
  isPrimary: z.boolean().optional().default(false),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;

export const updateContactSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).nullable().optional(),
  phone: z.string().min(1).max(50).nullable().optional(),
  title: z.string().min(1).max(100).nullable().optional(),
  isPrimary: z.boolean().optional(),
});

export type UpdateContactInput = z.infer<typeof updateContactSchema>;

export const contactResponseSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  title: z.string().nullable(),
  isPrimary: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ContactResponse = z.infer<typeof contactResponseSchema>;
