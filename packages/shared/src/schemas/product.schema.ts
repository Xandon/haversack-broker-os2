/**
 * Zod validation schemas for Product & Line Card domain API contracts.
 * Supports FR-019 (Product Catalog) and FR-020 (Brand Line Cards).
 */
import { z } from 'zod';

/**
 * Certification enum for product validation.
 * Common specialty food certifications.
 */
export const certificationEnum = z.enum(['Organic', 'Non-GMO', 'Kosher', 'Fair Trade']);

/**
 * Schema for generating a line card PDF for a brand.
 */
export const generateLineCardSchema = z.object({
  brand_id: z.string().uuid('Invalid brand ID'),
});

/**
 * Schema for sharing a line card with a contact.
 */
export const shareLineCardSchema = z.object({
  account_id: z.string().uuid('Invalid account ID'),
  contact_email: z.string().email('Invalid email address'),
  custom_message: z.string().max(2000, 'Message must not exceed 2000 characters').optional(),
});

/**
 * Schema for listing line cards with pagination.
 */
export const lineCardListQuerySchema = z.object({
  brand_id: z.string().uuid('Invalid brand ID'),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});

/** Input type for generating a line card */
export type GenerateLineCardInput = z.infer<typeof generateLineCardSchema>;

/** Input type for sharing a line card */
export type ShareLineCardInput = z.infer<typeof shareLineCardSchema>;

/** Query parameters for listing line cards */
export type LineCardListQuery = z.infer<typeof lineCardListQuerySchema>;
