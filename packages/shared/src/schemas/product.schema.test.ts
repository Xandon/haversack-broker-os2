import { describe, test, expect } from 'vitest';
import {
  availabilityStatusSchema,
  productSearchQuerySchema,
  productResponseSchema,
} from './product.schema';

describe('FR-012: Product schemas', () => {
  describe('availabilityStatusSchema', () => {
    test('FR-012: accepts valid availability statuses', () => {
      const statuses = ['active', 'seasonal', 'discontinued'];
      for (const status of statuses) {
        expect(availabilityStatusSchema.parse(status)).toBe(status);
      }
    });

    test('FR-012: rejects invalid availability status', () => {
      expect(() => availabilityStatusSchema.parse('out_of_stock')).toThrow();
    });
  });

  describe('productSearchQuerySchema', () => {
    test('FR-012: accepts valid search query', () => {
      const result = productSearchQuerySchema.parse({ q: 'honey' });
      expect(result.q).toBe('honey');
      expect(result.limit).toBe(20);
    });

    test('FR-012: rejects query shorter than 2 chars', () => {
      expect(() => productSearchQuerySchema.parse({ q: 'h' })).toThrow();
    });

    test('FR-012: accepts optional brand filter', () => {
      const result = productSearchQuerySchema.parse({
        q: 'honey',
        brandId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.brandId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    test('FR-012: coerces limit from string', () => {
      const result = productSearchQuerySchema.parse({ q: 'test', limit: '30' });
      expect(result.limit).toBe(30);
    });

    test('FR-012: rejects limit over 50', () => {
      expect(() =>
        productSearchQuerySchema.parse({ q: 'test', limit: '51' }),
      ).toThrow();
    });
  });

  describe('productResponseSchema', () => {
    test('FR-012: validates complete product response', () => {
      const response = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Artisan Honey 12oz',
        sku: 'AH-12',
        brand: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Pacific Honey Co',
        },
        unitPrice: 10.0,
        wholesalePrice: 7.5,
        promotionalPrice: 8.5,
        promotionalPriceStart: '2026-01-01T00:00:00.000Z',
        promotionalPriceEnd: '2026-04-01T00:00:00.000Z',
        caseSize: 24,
        revenueModelDefault: 'broker',
        commissionRate: 12.0,
        availabilityStatus: 'active',
      };
      const result = productResponseSchema.parse(response);
      expect(result.name).toBe('Artisan Honey 12oz');
      expect(result.promotionalPrice).toBe(8.5);
    });

    test('FR-012: accepts product with null optional fields', () => {
      const response = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Basic Product',
        sku: 'BP-01',
        brand: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Test Brand',
        },
        unitPrice: 5.0,
        wholesalePrice: null,
        promotionalPrice: null,
        promotionalPriceStart: null,
        promotionalPriceEnd: null,
        caseSize: null,
        revenueModelDefault: 'wholesale',
        commissionRate: 0,
        availabilityStatus: 'seasonal',
      };
      const result = productResponseSchema.parse(response);
      expect(result.wholesalePrice).toBeNull();
    });
  });
});
