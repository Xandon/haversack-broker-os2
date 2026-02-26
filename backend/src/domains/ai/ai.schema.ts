/**
 * AI domain Zod schemas.
 * Validation for reorder suggestion, meeting brief, email draft, and activity summary endpoints.
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

/** Reorder suggestion item shape */
export interface ReorderSuggestionItem {
  product_id: string;
  product_name: string;
  sku: string;
  brand_name: string;
  suggested_quantity: number;
  unit_price: number;
  line_total: number;
  reasoning: string;
}

/** Full reorder suggestion response shape */
export interface ReorderSuggestionResponse {
  account_id: string;
  account_name: string;
  ai_generated: boolean;
  ai_label?: string;
  suggestion: {
    items: ReorderSuggestionItem[];
    estimated_total: number;
    based_on_orders: number;
    analysis_period_months: number;
  } | null;
  message?: string;
  current_order_count?: number;
  generated_at?: string;
}
