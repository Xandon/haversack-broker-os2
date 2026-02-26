/**
 * Shared AI Zod schemas for cross-service API contracts.
 * Used by both frontend and backend for reorder suggestion validation.
 * Implements: FR-018, FR-035, FR-036
 */
import { z } from 'zod';

/** Schema for reorder suggestion request */
export const reorderSuggestionRequestSchema = z.object({
  account_id: z.string().uuid('Invalid account ID'),
});

export type ReorderSuggestionRequest = z.infer<typeof reorderSuggestionRequestSchema>;

/** Schema for submitting a modified reorder suggestion as a new order */
export const submitReorderSchema = z.object({
  account_id: z.string().uuid('Invalid account ID'),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid('Invalid product ID'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
        unit_price: z.number().min(0, 'Unit price must be non-negative').optional(),
      }),
    )
    .min(1, 'At least one item is required'),
  notes: z.string().max(2000).optional(),
});

export type SubmitReorderInput = z.infer<typeof submitReorderSchema>;
