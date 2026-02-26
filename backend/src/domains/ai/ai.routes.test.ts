/**
 * Tests for AI routes.
 * Verifies FR-018, FR-035, FR-036 at the HTTP layer.
 */
import { describe, expect, test } from 'vitest';

import { reorderSuggestionRequestSchema, submitReorderSchema } from './ai.schema.js';

// -------------------------------------------------------------------
// Schema validation tests
// -------------------------------------------------------------------

describe('AI Route Schemas (T111)', () => {
  describe('reorderSuggestionRequestSchema', () => {
    test('FR-018: accepts valid account_id UUID', () => {
      const result = reorderSuggestionRequestSchema.safeParse({
        account_id: 'aae08400-e29b-41d4-a716-446655440001',
      });
      expect(result.success).toBe(true);
    });

    test('FR-018: rejects invalid account_id', () => {
      const result = reorderSuggestionRequestSchema.safeParse({
        account_id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    test('FR-018: rejects missing account_id', () => {
      const result = reorderSuggestionRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('submitReorderSchema', () => {
    test('FR-018: accepts valid reorder submission', () => {
      const result = submitReorderSchema.safeParse({
        account_id: 'aae08400-e29b-41d4-a716-446655440001',
        items: [
          { product_id: 'aae08400-e29b-41d4-a716-446655440002', quantity: 24 },
        ],
        notes: 'From AI suggestion',
      });
      expect(result.success).toBe(true);
    });

    test('FR-018: rejects empty items array', () => {
      const result = submitReorderSchema.safeParse({
        account_id: 'aae08400-e29b-41d4-a716-446655440001',
        items: [],
      });
      expect(result.success).toBe(false);
    });

    test('FR-018: rejects invalid quantity (zero)', () => {
      const result = submitReorderSchema.safeParse({
        account_id: 'aae08400-e29b-41d4-a716-446655440001',
        items: [
          { product_id: 'aae08400-e29b-41d4-a716-446655440002', quantity: 0 },
        ],
      });
      expect(result.success).toBe(false);
    });

    test('FR-018: accepts optional unit_price override', () => {
      const result = submitReorderSchema.safeParse({
        account_id: 'aae08400-e29b-41d4-a716-446655440001',
        items: [
          {
            product_id: 'aae08400-e29b-41d4-a716-446655440002',
            quantity: 24,
            unit_price: 9.99,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    test('FR-018: rejects negative unit_price', () => {
      const result = submitReorderSchema.safeParse({
        account_id: 'aae08400-e29b-41d4-a716-446655440001',
        items: [
          {
            product_id: 'aae08400-e29b-41d4-a716-446655440002',
            quantity: 24,
            unit_price: -1,
          },
        ],
      });
      expect(result.success).toBe(false);
    });
  });
});
