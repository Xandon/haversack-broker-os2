import { describe, test, expect } from 'vitest';
import {
  contactSearchQuerySchema,
  contactSearchResultSchema,
  globalSearchResultSchema,
} from './search.schema';

describe('FR-032: Search schemas', () => {
  describe('contactSearchQuerySchema', () => {
    test('FR-032: validates valid search query', () => {
      const result = contactSearchQuerySchema.parse({ q: 'pacific', limit: '5' });
      expect(result).toEqual({ q: 'pacific', limit: 5 });
    });

    test('FR-032: defaults limit to 5', () => {
      const result = contactSearchQuerySchema.parse({ q: 'test' });
      expect(result.limit).toBe(5);
    });

    test('FR-032: rejects empty query string', () => {
      expect(() => contactSearchQuerySchema.parse({ q: '' })).toThrow();
    });

    test('FR-032: rejects limit above 50', () => {
      expect(() => contactSearchQuerySchema.parse({ q: 'test', limit: '51' })).toThrow();
    });

    test('FR-032: rejects limit below 1', () => {
      expect(() => contactSearchQuerySchema.parse({ q: 'test', limit: '0' })).toThrow();
    });

    test('FR-032: coerces string limit to number', () => {
      const result = contactSearchQuerySchema.parse({ q: 'test', limit: '10' });
      expect(result.limit).toBe(10);
      expect(typeof result.limit).toBe('number');
    });
  });

  describe('contactSearchResultSchema', () => {
    test('FR-032: validates valid contact search result', () => {
      const result = contactSearchResultSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        phone: '503-555-0123',
        accountId: '550e8400-e29b-41d4-a716-446655440001',
        accountName: 'Pacific Foods NW',
      });
      expect(result.firstName).toBe('Jane');
      expect(result.accountName).toBe('Pacific Foods NW');
    });

    test('FR-032: allows null email and phone', () => {
      const result = contactSearchResultSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        firstName: 'Jane',
        lastName: 'Doe',
        email: null,
        phone: null,
        accountId: '550e8400-e29b-41d4-a716-446655440001',
        accountName: 'Pacific Foods NW',
      });
      expect(result.email).toBeNull();
      expect(result.phone).toBeNull();
    });

    test('FR-032: rejects invalid UUID for id', () => {
      expect(() =>
        contactSearchResultSchema.parse({
          id: 'not-a-uuid',
          firstName: 'Jane',
          lastName: 'Doe',
          email: null,
          phone: null,
          accountId: '550e8400-e29b-41d4-a716-446655440001',
          accountName: 'Pacific Foods NW',
        }),
      ).toThrow();
    });
  });

  describe('globalSearchResultSchema', () => {
    test('FR-032: validates account search result', () => {
      const result = globalSearchResultSchema.parse({
        type: 'account',
        id: '123',
        name: 'Pacific Foods NW',
        secondaryText: 'Portland Metro',
        url: '/accounts/123',
      });
      expect(result.type).toBe('account');
      expect(result.parentId).toBeUndefined();
    });

    test('FR-032: validates contact search result with parentId', () => {
      const result = globalSearchResultSchema.parse({
        type: 'contact',
        id: '456',
        name: 'Jane Doe',
        secondaryText: 'jane@example.com',
        url: '/accounts/789?tab=contacts',
        parentId: '789',
      });
      expect(result.type).toBe('contact');
      expect(result.parentId).toBe('789');
    });

    test('FR-032: validates product search result', () => {
      const result = globalSearchResultSchema.parse({
        type: 'product',
        id: '101',
        name: 'Artisan Sourdough',
        secondaryText: 'ASB-001',
        url: '/products/101',
      });
      expect(result.type).toBe('product');
    });

    test('FR-032: rejects invalid type', () => {
      expect(() =>
        globalSearchResultSchema.parse({
          type: 'order',
          id: '123',
          name: 'Test',
          secondaryText: 'Test',
          url: '/orders/123',
        }),
      ).toThrow();
    });
  });
});
