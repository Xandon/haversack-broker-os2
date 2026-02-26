import { describe, test, expect } from 'vitest';
import {
  availabilityStatusSchema,
  productSearchQuerySchema,
  productResponseSchema,
  createProductSchema,
  updateProductSchema,
  productListQuerySchema,
  productDetailResponseSchema,
} from './product.schema';

describe('FR-012/FR-018: Product schemas', () => {
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

    test('FR-018b: accepts limit up to 100', () => {
      const result = productSearchQuerySchema.parse({ q: 'test', limit: '100' });
      expect(result.limit).toBe(100);
    });

    test('FR-018b: rejects limit over 100', () => {
      expect(() =>
        productSearchQuerySchema.parse({ q: 'test', limit: '101' }),
      ).toThrow();
    });

    test('FR-018b: accepts category filter in search', () => {
      const result = productSearchQuerySchema.parse({ q: 'test', category: 'honey' });
      expect(result.category).toBe('honey');
    });

    test('FR-018b: accepts certification filter in search', () => {
      const result = productSearchQuerySchema.parse({ q: 'test', certification: 'organic' });
      expect(result.certification).toBe('organic');
    });

    test('FR-018b: rejects invalid category in search', () => {
      expect(() =>
        productSearchQuerySchema.parse({ q: 'test', category: 'invalid_cat' }),
      ).toThrow();
    });
  });

  describe('productResponseSchema', () => {
    const baseResponse = {
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
      category: 'honey',
      subcategory: 'raw',
      description: 'Premium raw honey',
      imageUrl: 'https://example.com/honey.jpg',
      certifications: ['organic', 'non_gmo'],
      allergens: [],
      dietaryAttributes: ['vegan'],
    };

    test('FR-018: validates complete product response with catalog fields', () => {
      const result = productResponseSchema.parse(baseResponse);
      expect(result.name).toBe('Artisan Honey 12oz');
      expect(result.category).toBe('honey');
      expect(result.certifications).toEqual(['organic', 'non_gmo']);
      expect(result.dietaryAttributes).toEqual(['vegan']);
    });

    test('FR-018: accepts product with null optional catalog fields', () => {
      const response = {
        ...baseResponse,
        category: null,
        subcategory: null,
        description: null,
        imageUrl: null,
        wholesalePrice: null,
        promotionalPrice: null,
        promotionalPriceStart: null,
        promotionalPriceEnd: null,
        caseSize: null,
      };
      const result = productResponseSchema.parse(response);
      expect(result.category).toBeNull();
      expect(result.imageUrl).toBeNull();
    });
  });

  describe('FR-018a: createProductSchema', () => {
    test('FR-018a: validates product with required fields only', () => {
      const valid = {
        name: 'Honey 12oz',
        sku: 'HN-12',
        brandId: '550e8400-e29b-41d4-a716-446655440000',
        unitPrice: 10.99,
        revenueModelDefault: 'broker',
      };
      const result = createProductSchema.parse(valid);
      expect(result.name).toBe('Honey 12oz');
      expect(result.availabilityStatus).toBe('active');
      expect(result.certifications).toEqual([]);
      expect(result.allergens).toEqual([]);
      expect(result.dietaryAttributes).toEqual([]);
    });

    test('FR-018: validates product with all catalog fields', () => {
      const valid = {
        name: 'Honey 12oz',
        sku: 'HN-12',
        brandId: '550e8400-e29b-41d4-a716-446655440000',
        unitPrice: 10.99,
        wholesalePrice: 7.50,
        caseSize: 24,
        revenueModelDefault: 'broker',
        category: 'honey',
        subcategory: 'raw',
        description: 'Premium raw honey from PNW',
        imageUrl: 'https://example.com/honey.jpg',
        certifications: ['organic', 'non_gmo'],
        allergens: [],
        dietaryAttributes: ['vegan'],
      };
      const result = createProductSchema.parse(valid);
      expect(result.category).toBe('honey');
      expect(result.certifications).toEqual(['organic', 'non_gmo']);
    });

    test('FR-018d: rejects empty SKU', () => {
      expect(() =>
        createProductSchema.parse({ name: 'Test', sku: '', brandId: '550e8400-e29b-41d4-a716-446655440000', unitPrice: 10, revenueModelDefault: 'broker' }),
      ).toThrow();
    });

    test('FR-018: rejects negative unit price', () => {
      expect(() =>
        createProductSchema.parse({ name: 'Test', sku: 'T-1', brandId: '550e8400-e29b-41d4-a716-446655440000', unitPrice: -1, revenueModelDefault: 'broker' }),
      ).toThrow();
    });

    test('FR-018: rejects invalid certification value', () => {
      expect(() =>
        createProductSchema.parse({ name: 'Test', sku: 'T-1', brandId: '550e8400-e29b-41d4-a716-446655440000', unitPrice: 10, revenueModelDefault: 'broker', certifications: ['invalid'] }),
      ).toThrow();
    });

    test('FR-018: rejects invalid allergen value', () => {
      expect(() =>
        createProductSchema.parse({ name: 'Test', sku: 'T-1', brandId: '550e8400-e29b-41d4-a716-446655440000', unitPrice: 10, revenueModelDefault: 'broker', allergens: ['corn'] }),
      ).toThrow();
    });

    test('FR-018: rejects invalid category', () => {
      expect(() =>
        createProductSchema.parse({ name: 'Test', sku: 'T-1', brandId: '550e8400-e29b-41d4-a716-446655440000', unitPrice: 10, revenueModelDefault: 'broker', category: 'electronics' }),
      ).toThrow();
    });
  });

  describe('FR-018e: updateProductSchema', () => {
    test('FR-018e: allows all fields optional', () => {
      const result = updateProductSchema.parse({});
      expect(result).toEqual({});
    });

    test('FR-018e: allows partial updates', () => {
      const result = updateProductSchema.parse({ category: 'condiments', certifications: ['organic'] });
      expect(result.category).toBe('condiments');
      expect(result.certifications).toEqual(['organic']);
    });

    test('FR-018e: allows nullable fields to clear values', () => {
      const result = updateProductSchema.parse({ category: null, description: null, imageUrl: null });
      expect(result.category).toBeNull();
      expect(result.description).toBeNull();
    });

    test('FR-018e: allows isActive toggle', () => {
      const result = updateProductSchema.parse({ isActive: false });
      expect(result.isActive).toBe(false);
    });
  });

  describe('FR-018b: productListQuerySchema', () => {
    test('FR-018b: defaults for list query', () => {
      const result = productListQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.sortBy).toBe('name');
      expect(result.sortOrder).toBe('asc');
    });

    test('FR-018b: accepts all filter fields', () => {
      const result = productListQuerySchema.parse({
        brandId: '550e8400-e29b-41d4-a716-446655440000',
        category: 'honey',
        certification: 'organic',
        allergen: 'milk',
        dietaryAttribute: 'vegan',
        availabilityStatus: 'active',
        limit: '50',
      });
      expect(result.brandId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.category).toBe('honey');
      expect(result.certification).toBe('organic');
      expect(result.allergen).toBe('milk');
      expect(result.dietaryAttribute).toBe('vegan');
      expect(result.limit).toBe(50);
    });

    test('FR-018b: accepts sort options', () => {
      const result = productListQuerySchema.parse({ sortBy: 'sku', sortOrder: 'desc' });
      expect(result.sortBy).toBe('sku');
      expect(result.sortOrder).toBe('desc');
    });
  });

  describe('FR-018: productDetailResponseSchema', () => {
    test('FR-018: extends response with timestamps', () => {
      const valid = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Product',
        sku: 'TP-01',
        brand: { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Brand' },
        unitPrice: 10,
        wholesalePrice: null,
        promotionalPrice: null,
        promotionalPriceStart: null,
        promotionalPriceEnd: null,
        caseSize: null,
        revenueModelDefault: 'broker',
        commissionRate: 10,
        availabilityStatus: 'active',
        category: null,
        subcategory: null,
        description: null,
        imageUrl: null,
        certifications: [],
        allergens: [],
        dietaryAttributes: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      const result = productDetailResponseSchema.parse(valid);
      expect(result.createdAt).toBe('2026-01-01T00:00:00.000Z');
    });
  });
});
