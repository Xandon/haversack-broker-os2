/**
 * Product route schema validation tests.
 * T117: Validates Zod schemas used in product and line card routes.
 * Tests reference FR-019.
 */
import { describe, expect, test } from 'vitest';

import {
  createProductSchema,
  updateProductSchema,
  generateLineCardSchema,
  shareLineCardSchema,
} from '@haversack/shared';

// ---------------------------------------------------------------------------
// createProductSchema Tests (FR-019)
// ---------------------------------------------------------------------------

describe('createProductSchema', () => {
  test('FR-019: createProductSchema validates required fields', () => {
    const valid = {
      brand_id: '990e8400-e29b-41d4-a716-446655440001',
      name: 'Organic Honey 12oz',
      sku: 'BEE-HON-12',
      category: 'Honey',
      unit_price: 8.50,
      revenue_model: 'broker',
    };

    const result = createProductSchema.safeParse(valid);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.name).toBe('Organic Honey 12oz');
      expect(result.data.sku).toBe('BEE-HON-12');
      expect(result.data.certifications).toEqual([]);
      expect(result.data.allergens).toEqual([]);
    }
  });

  test('FR-019: createProductSchema rejects invalid allergens', () => {
    const invalid = {
      brand_id: '990e8400-e29b-41d4-a716-446655440001',
      name: 'Test Product',
      sku: 'TST-001',
      category: 'Test',
      unit_price: 10.00,
      revenue_model: 'broker',
      allergens: ['InvalidAllergen'],
    };

    const result = createProductSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateProductSchema Tests (FR-019)
// ---------------------------------------------------------------------------

describe('updateProductSchema', () => {
  test('FR-019: updateProductSchema allows partial updates', () => {
    const partial = {
      name: 'Updated Name',
    };

    const result = updateProductSchema.safeParse(partial);
    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.name).toBe('Updated Name');
      expect(result.data.sku).toBeUndefined();
      expect(result.data.brand_id).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// generateLineCardSchema Tests (FR-019)
// ---------------------------------------------------------------------------

describe('generateLineCardSchema', () => {
  test('FR-019: generateLineCardSchema validates brand_id', () => {
    const valid = {
      brand_id: '990e8400-e29b-41d4-a716-446655440001',
    };

    const result = generateLineCardSchema.safeParse(valid);
    expect(result.success).toBe(true);

    // Invalid UUID should fail
    const invalid = { brand_id: 'not-a-uuid' };
    const invalidResult = generateLineCardSchema.safeParse(invalid);
    expect(invalidResult.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// shareLineCardSchema Tests (FR-019)
// ---------------------------------------------------------------------------

describe('shareLineCardSchema', () => {
  test('FR-019: shareLineCardSchema validates email format', () => {
    const valid = {
      account_id: '880e8400-e29b-41d4-a716-446655440001',
      contact_email: 'buyer@store.com',
      custom_message: 'Here is our latest line card!',
    };

    const result = shareLineCardSchema.safeParse(valid);
    expect(result.success).toBe(true);

    // Invalid email should fail
    const invalidEmail = {
      account_id: '880e8400-e29b-41d4-a716-446655440001',
      contact_email: 'not-an-email',
    };
    const invalidResult = shareLineCardSchema.safeParse(invalidEmail);
    expect(invalidResult.success).toBe(false);
  });
});
