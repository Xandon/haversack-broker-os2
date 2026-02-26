import { describe, test, expect } from 'vitest';
import {
  certificationSchema,
  allergenSchema,
  dietaryAttributeSchema,
  productCategorySchema,
  createBrandSchema,
  updateBrandSchema,
  brandListQuerySchema,
  brandResponseSchema,
  brandWithCountsResponseSchema,
  lineCardShareSchema,
} from './brand.schema';

describe('FR-018/FR-019: Brand & catalog enum schemas', () => {
  test('FR-018: certificationSchema accepts valid certifications', () => {
    expect(certificationSchema.parse('organic')).toBe('organic');
    expect(certificationSchema.parse('non_gmo')).toBe('non_gmo');
    expect(certificationSchema.parse('gluten_free')).toBe('gluten_free');
    expect(certificationSchema.parse('kosher')).toBe('kosher');
    expect(certificationSchema.parse('vegan')).toBe('vegan');
  });

  test('FR-018: certificationSchema rejects invalid values', () => {
    expect(() => certificationSchema.parse('invalid')).toThrow();
    expect(() => certificationSchema.parse('')).toThrow();
  });

  test('FR-018: allergenSchema accepts FDA Big 9 allergens', () => {
    const allergens = ['wheat', 'milk', 'eggs', 'fish', 'shellfish', 'tree_nuts', 'peanuts', 'soybeans', 'sesame'];
    for (const a of allergens) {
      expect(allergenSchema.parse(a)).toBe(a);
    }
  });

  test('FR-018: allergenSchema rejects invalid values', () => {
    expect(() => allergenSchema.parse('corn')).toThrow();
  });

  test('FR-018: dietaryAttributeSchema accepts valid values', () => {
    const attrs = ['vegetarian', 'vegan', 'keto', 'paleo', 'low_sodium', 'sugar_free', 'dairy_free', 'whole_grain'];
    for (const a of attrs) {
      expect(dietaryAttributeSchema.parse(a)).toBe(a);
    }
  });

  test('FR-018: productCategorySchema accepts valid categories', () => {
    const categories = ['honey', 'condiments', 'spreads', 'sauces', 'snacks', 'beverages', 'dairy', 'bakery', 'produce', 'meat', 'seafood', 'pantry', 'frozen', 'other'];
    for (const c of categories) {
      expect(productCategorySchema.parse(c)).toBe(c);
    }
  });

  test('FR-018: productCategorySchema rejects invalid values', () => {
    expect(() => productCategorySchema.parse('electronics')).toThrow();
  });
});

describe('FR-019c: Brand CRUD schemas', () => {
  test('FR-019c: createBrandSchema validates required fields', () => {
    const valid = {
      name: 'Mountain Meadow Farms',
      commissionRate: 12.5,
    };
    const result = createBrandSchema.parse(valid);
    expect(result.name).toBe('Mountain Meadow Farms');
    expect(result.commissionRate).toBe(12.5);
  });

  test('FR-019c: createBrandSchema accepts all optional fields', () => {
    const valid = {
      name: 'Mountain Meadow Farms',
      commissionRate: 12.5,
      description: 'Premium honey producer',
      logoUrl: 'https://example.com/logo.png',
      contactName: 'John Smith',
      contactEmail: 'john@meadow.com',
      contactPhone: '555-1234',
      website: 'https://meadow.com',
    };
    const result = createBrandSchema.parse(valid);
    expect(result.description).toBe('Premium honey producer');
    expect(result.logoUrl).toBe('https://example.com/logo.png');
    expect(result.contactEmail).toBe('john@meadow.com');
  });

  test('FR-019c: createBrandSchema rejects empty name', () => {
    expect(() => createBrandSchema.parse({ name: '', commissionRate: 10 })).toThrow();
  });

  test('FR-019c: createBrandSchema rejects commission rate > 100', () => {
    expect(() => createBrandSchema.parse({ name: 'Test', commissionRate: 101 })).toThrow();
  });

  test('FR-019c: createBrandSchema rejects commission rate < 0', () => {
    expect(() => createBrandSchema.parse({ name: 'Test', commissionRate: -1 })).toThrow();
  });

  test('FR-019c: createBrandSchema rejects invalid email', () => {
    expect(() =>
      createBrandSchema.parse({ name: 'Test', commissionRate: 10, contactEmail: 'not-email' }),
    ).toThrow();
  });

  test('FR-019c: createBrandSchema rejects invalid URL for logoUrl', () => {
    expect(() =>
      createBrandSchema.parse({ name: 'Test', commissionRate: 10, logoUrl: 'not-a-url' }),
    ).toThrow();
  });

  test('FR-019c: updateBrandSchema allows all fields optional', () => {
    const result = updateBrandSchema.parse({});
    expect(result).toEqual({});
  });

  test('FR-019c: updateBrandSchema allows nullable fields', () => {
    const result = updateBrandSchema.parse({ description: null, logoUrl: null });
    expect(result.description).toBeNull();
    expect(result.logoUrl).toBeNull();
  });

  test('FR-019c: updateBrandSchema allows isActive toggle', () => {
    const result = updateBrandSchema.parse({ isActive: false });
    expect(result.isActive).toBe(false);
  });

  test('FR-019c: brandListQuerySchema defaults', () => {
    const result = brandListQuerySchema.parse({});
    expect(result.limit).toBe(20);
    expect(result.sortBy).toBe('name');
    expect(result.sortOrder).toBe('asc');
  });

  test('FR-019c: brandListQuerySchema accepts isActive filter', () => {
    const result = brandListQuerySchema.parse({ isActive: 'true' });
    expect(result.isActive).toBe(true);
  });

  test('FR-019c: brandResponseSchema validates complete response', () => {
    const valid = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Test Brand',
      commissionRate: 10,
      description: null,
      logoUrl: null,
      contactName: null,
      contactEmail: null,
      contactPhone: null,
      website: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    expect(() => brandResponseSchema.parse(valid)).not.toThrow();
  });

  test('FR-019c: brandWithCountsResponseSchema includes product counts', () => {
    const valid = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Test Brand',
      commissionRate: 10,
      description: null,
      logoUrl: null,
      contactName: null,
      contactEmail: null,
      contactPhone: null,
      website: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      productCount: 5,
      activeProductCount: 3,
    };
    const result = brandWithCountsResponseSchema.parse(valid);
    expect(result.productCount).toBe(5);
    expect(result.activeProductCount).toBe(3);
  });

  test('FR-019b: lineCardShareSchema requires accountId UUID', () => {
    const valid = { accountId: '00000000-0000-0000-0000-000000000001' };
    expect(() => lineCardShareSchema.parse(valid)).not.toThrow();
    expect(() => lineCardShareSchema.parse({ accountId: 'not-uuid' })).toThrow();
    expect(() => lineCardShareSchema.parse({})).toThrow();
  });
});
