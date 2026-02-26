import { describe, test, expect } from 'vitest';
import {
  createAccountSchema,
  updateAccountSchema,
  accountListQuerySchema,
  accountResponseSchema,
  duplicateCheckQuerySchema,
  accountTypeSchema,
} from './account.schema';

describe('FR-001: Account Zod schemas', () => {
  describe('accountTypeSchema', () => {
    test('FR-001: accepts valid account types', () => {
      expect(accountTypeSchema.parse('retail')).toBe('retail');
      expect(accountTypeSchema.parse('restaurant')).toBe('restaurant');
      expect(accountTypeSchema.parse('distributor')).toBe('distributor');
    });

    test('FR-001: rejects invalid account type', () => {
      expect(() => accountTypeSchema.parse('wholesale')).toThrow();
    });
  });

  describe('createAccountSchema', () => {
    const validInput = {
      name: 'Pacific Bistro',
      accountType: 'restaurant' as const,
      streetAddress: '123 Main St',
      city: 'Portland',
      state: 'OR',
      zipCode: '97201',
      territoryId: '00000000-0000-4000-a000-000000000001',
      primaryContact: {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        phone: '503-555-1234',
      },
    };

    test('FR-001: accepts valid create input with all required fields', () => {
      const result = createAccountSchema.parse(validInput);
      expect(result.name).toBe('Pacific Bistro');
      expect(result.accountType).toBe('restaurant');
      expect(result.skipDuplicateCheck).toBe(false);
    });

    test('FR-001: rejects blank account name', () => {
      expect(() =>
        createAccountSchema.parse({ ...validInput, name: '' }),
      ).toThrow();
    });

    test('FR-001: rejects name exceeding 255 characters', () => {
      expect(() =>
        createAccountSchema.parse({ ...validInput, name: 'x'.repeat(256) }),
      ).toThrow();
    });

    test('FR-001: trims whitespace from name', () => {
      const result = createAccountSchema.parse({
        ...validInput,
        name: '  Pacific Bistro  ',
      });
      expect(result.name).toBe('Pacific Bistro');
    });

    test('FR-001: rejects invalid territory UUID', () => {
      expect(() =>
        createAccountSchema.parse({ ...validInput, territoryId: 'not-a-uuid' }),
      ).toThrow();
    });

    test('FR-001: accepts optional parentAccountId as UUID', () => {
      const result = createAccountSchema.parse({
        ...validInput,
        parentAccountId: '00000000-0000-4000-a000-000000000002',
      });
      expect(result.parentAccountId).toBe(
        '00000000-0000-4000-a000-000000000002',
      );
    });

    test('FR-001: accepts null parentAccountId', () => {
      const result = createAccountSchema.parse({
        ...validInput,
        parentAccountId: null,
      });
      expect(result.parentAccountId).toBeNull();
    });

    test('FR-001: accepts skipDuplicateCheck flag', () => {
      const result = createAccountSchema.parse({
        ...validInput,
        skipDuplicateCheck: true,
      });
      expect(result.skipDuplicateCheck).toBe(true);
    });

    test('FR-001: rejects missing primaryContact', () => {
      const { primaryContact: _, ...noContact } = validInput;
      expect(() => createAccountSchema.parse(noContact)).toThrow();
    });

    test('FR-001: validates primaryContact email format', () => {
      expect(() =>
        createAccountSchema.parse({
          ...validInput,
          primaryContact: { ...validInput.primaryContact, email: 'not-email' },
        }),
      ).toThrow();
    });
  });

  describe('updateAccountSchema', () => {
    test('FR-001: accepts partial update with single field', () => {
      const result = updateAccountSchema.parse({ name: 'Updated Name' });
      expect(result.name).toBe('Updated Name');
    });

    test('FR-001: accepts empty object (no changes)', () => {
      const result = updateAccountSchema.parse({});
      expect(result).toEqual({});
    });

    test('FR-001: rejects invalid accountType', () => {
      expect(() =>
        updateAccountSchema.parse({ accountType: 'invalid' }),
      ).toThrow();
    });
  });

  describe('accountListQuerySchema', () => {
    test('FR-003: accepts default query (no params)', () => {
      const result = accountListQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.sortBy).toBe('name');
      expect(result.sortOrder).toBe('asc');
      expect(result.includeDeleted).toBe(false);
    });

    test('FR-003: rejects search query under 3 characters', () => {
      expect(() =>
        accountListQuerySchema.parse({ search: 'ab' }),
      ).toThrow();
    });

    test('FR-003: accepts valid search query', () => {
      const result = accountListQuerySchema.parse({ search: 'pac' });
      expect(result.search).toBe('pac');
    });

    test('FR-006: accepts health score range filters', () => {
      const result = accountListQuerySchema.parse({
        healthScoreMin: 0,
        healthScoreMax: 39,
      });
      expect(result.healthScoreMin).toBe(0);
      expect(result.healthScoreMax).toBe(39);
    });

    test('FR-003: coerces limit to number', () => {
      const result = accountListQuerySchema.parse({ limit: '50' });
      expect(result.limit).toBe(50);
    });

    test('FR-003: rejects limit over 100', () => {
      expect(() =>
        accountListQuerySchema.parse({ limit: 101 }),
      ).toThrow();
    });
  });

  describe('accountResponseSchema', () => {
    test('FR-002: validates complete account response', () => {
      const response = {
        id: '00000000-0000-4000-a000-000000000001',
        name: 'Pacific Bistro',
        accountType: 'restaurant',
        streetAddress: '123 Main St',
        city: 'Portland',
        state: 'OR',
        zipCode: '97201',
        territoryId: '00000000-0000-4000-a000-000000000002',
        parentAccountId: null,
        healthScore: 72,
        healthScoreCalculatedAt: '2026-02-26T02:00:00.000Z',
        isActive: true,
        createdAt: '2026-02-26T00:00:00.000Z',
        updatedAt: '2026-02-26T00:00:00.000Z',
      };
      const result = accountResponseSchema.parse(response);
      expect(result.name).toBe('Pacific Bistro');
      expect(result.healthScore).toBe(72);
    });

    test('FR-002: accepts null health score for new accounts', () => {
      const response = {
        id: '00000000-0000-4000-a000-000000000001',
        name: 'New Account',
        accountType: 'retail',
        streetAddress: '456 Oak Ave',
        city: 'Seattle',
        state: 'WA',
        zipCode: '98101',
        territoryId: '00000000-0000-4000-a000-000000000002',
        parentAccountId: null,
        healthScore: null,
        healthScoreCalculatedAt: null,
        isActive: true,
        createdAt: '2026-02-26T00:00:00.000Z',
        updatedAt: '2026-02-26T00:00:00.000Z',
      };
      const result = accountResponseSchema.parse(response);
      expect(result.healthScore).toBeNull();
    });
  });

  describe('duplicateCheckQuerySchema', () => {
    test('FR-005: requires name for duplicate check', () => {
      const result = duplicateCheckQuerySchema.parse({ name: 'Pacific Bistro' });
      expect(result.name).toBe('Pacific Bistro');
    });

    test('FR-005: rejects empty name', () => {
      expect(() => duplicateCheckQuerySchema.parse({ name: '' })).toThrow();
    });

    test('FR-005: accepts optional phone and address', () => {
      const result = duplicateCheckQuerySchema.parse({
        name: 'Pacific Bistro',
        phone: '503-555-1234',
        streetAddress: '123 Main St',
      });
      expect(result.phone).toBe('503-555-1234');
      expect(result.streetAddress).toBe('123 Main St');
    });
  });
});
