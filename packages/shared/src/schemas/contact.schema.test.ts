import { describe, test, expect } from 'vitest';
import {
  createContactSchema,
  updateContactSchema,
  contactResponseSchema,
} from './contact.schema';

describe('FR-002: Contact Zod schemas', () => {
  describe('createContactSchema', () => {
    test('FR-002: accepts valid contact with all fields', () => {
      const result = createContactSchema.parse({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        phone: '503-555-1234',
        title: 'Owner',
        isPrimary: true,
      });
      expect(result.firstName).toBe('Jane');
      expect(result.isPrimary).toBe(true);
    });

    test('FR-002: accepts contact with only required fields', () => {
      const result = createContactSchema.parse({
        firstName: 'Jane',
        lastName: 'Doe',
      });
      expect(result.isPrimary).toBe(false);
      expect(result.email).toBeUndefined();
    });

    test('FR-002: rejects blank first name', () => {
      expect(() =>
        createContactSchema.parse({ firstName: '', lastName: 'Doe' }),
      ).toThrow();
    });

    test('FR-002: rejects blank last name', () => {
      expect(() =>
        createContactSchema.parse({ firstName: 'Jane', lastName: '' }),
      ).toThrow();
    });

    test('FR-002: rejects invalid email format', () => {
      expect(() =>
        createContactSchema.parse({
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'not-an-email',
        }),
      ).toThrow();
    });

    test('FR-002: rejects first name exceeding 100 characters', () => {
      expect(() =>
        createContactSchema.parse({
          firstName: 'x'.repeat(101),
          lastName: 'Doe',
        }),
      ).toThrow();
    });
  });

  describe('updateContactSchema', () => {
    test('FR-002: accepts partial update', () => {
      const result = updateContactSchema.parse({ firstName: 'Updated' });
      expect(result.firstName).toBe('Updated');
    });

    test('FR-002: accepts null for nullable fields', () => {
      const result = updateContactSchema.parse({ email: null, phone: null });
      expect(result.email).toBeNull();
      expect(result.phone).toBeNull();
    });

    test('FR-002: accepts empty object', () => {
      const result = updateContactSchema.parse({});
      expect(result).toEqual({});
    });
  });

  describe('contactResponseSchema', () => {
    test('FR-002: validates complete contact response', () => {
      const response = {
        id: '00000000-0000-4000-a000-000000000001',
        accountId: '00000000-0000-4000-a000-000000000002',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        phone: '503-555-1234',
        title: 'Owner',
        isPrimary: true,
        createdAt: '2026-02-26T00:00:00.000Z',
        updatedAt: '2026-02-26T00:00:00.000Z',
      };
      const result = contactResponseSchema.parse(response);
      expect(result.firstName).toBe('Jane');
    });

    test('FR-002: accepts null for optional fields', () => {
      const response = {
        id: '00000000-0000-4000-a000-000000000001',
        accountId: '00000000-0000-4000-a000-000000000002',
        firstName: 'Jane',
        lastName: 'Doe',
        email: null,
        phone: null,
        title: null,
        isPrimary: false,
        createdAt: '2026-02-26T00:00:00.000Z',
        updatedAt: '2026-02-26T00:00:00.000Z',
      };
      const result = contactResponseSchema.parse(response);
      expect(result.email).toBeNull();
    });
  });
});
