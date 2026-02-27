import { describe, test, expect } from 'vitest';
import {
  createUserSchema,
  updateUserSchema,
  userListQuerySchema,
  importConfirmSchema,
  importHistoryQuerySchema,
  dataImportEntityTypeSchema,
  qualityDrillDownQuerySchema,
  ADMIN_ERROR_CODES,
} from './admin.schema';

describe('FR-026: Admin user management schemas', () => {
  describe('createUserSchema', () => {
    test('FR-026: accepts valid user creation input', () => {
      const input = {
        email: 'rep3@haversack.test',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'rep',
        territoryIds: ['00000000-0000-4000-a000-000000000001'],
        temporaryPassword: 'TempPass123!',
      };
      const result = createUserSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test('FR-026: rejects missing email', () => {
      const input = {
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'rep',
        temporaryPassword: 'TempPass123!',
      };
      const result = createUserSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('FR-026: rejects invalid email format', () => {
      const input = {
        email: 'not-an-email',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'rep',
        temporaryPassword: 'TempPass123!',
      };
      const result = createUserSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('FR-026: rejects invalid role', () => {
      const input = {
        email: 'rep3@haversack.test',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'superadmin',
        temporaryPassword: 'TempPass123!',
      };
      const result = createUserSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('FR-026: rejects short password (< 8 chars)', () => {
      const input = {
        email: 'rep3@haversack.test',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'rep',
        temporaryPassword: 'short',
      };
      const result = createUserSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('FR-026: defaults territoryIds to empty array', () => {
      const input = {
        email: 'rep3@haversack.test',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'rep',
        temporaryPassword: 'TempPass123!',
      };
      const result = createUserSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.territoryIds).toEqual([]);
      }
    });

    test('FR-026: accepts all five valid roles', () => {
      const roles = ['admin', 'manager', 'rep', 'logistics', 'viewer'];
      for (const role of roles) {
        const result = createUserSchema.safeParse({
          email: `test@haversack.test`,
          firstName: 'Test',
          lastName: 'User',
          role,
          temporaryPassword: 'TempPass123!',
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('updateUserSchema', () => {
    test('FR-026: accepts partial update with role change', () => {
      const result = updateUserSchema.safeParse({ role: 'manager' });
      expect(result.success).toBe(true);
    });

    test('FR-026: accepts isActive toggle', () => {
      const result = updateUserSchema.safeParse({ isActive: false });
      expect(result.success).toBe(true);
    });

    test('FR-026: accepts empty update (all optional)', () => {
      const result = updateUserSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    test('FR-026: rejects invalid role in update', () => {
      const result = updateUserSchema.safeParse({ role: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('userListQuerySchema', () => {
    test('FR-026: applies default page and limit', () => {
      const result = userListQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    test('FR-026: caps limit at 100', () => {
      const result = userListQuerySchema.safeParse({ limit: '200' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(100);
      }
    });

    test('FR-026: accepts role filter', () => {
      const result = userListQuerySchema.safeParse({ role: 'rep' });
      expect(result.success).toBe(true);
    });
  });
});

describe('FR-027: Data import schemas', () => {
  describe('dataImportEntityTypeSchema', () => {
    test('FR-027: accepts valid entity types', () => {
      const types = ['account', 'contact', 'product', 'order'];
      for (const t of types) {
        expect(dataImportEntityTypeSchema.safeParse(t).success).toBe(true);
      }
    });

    test('FR-027: rejects invalid entity type', () => {
      expect(dataImportEntityTypeSchema.safeParse('user').success).toBe(false);
    });
  });

  describe('importConfirmSchema', () => {
    test('FR-027: defaults skipErrors to true', () => {
      const result = importConfirmSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.skipErrors).toBe(true);
      }
    });

    test('FR-027: accepts explicit skipErrors false', () => {
      const result = importConfirmSchema.safeParse({ skipErrors: false });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.skipErrors).toBe(false);
      }
    });
  });

  describe('importHistoryQuerySchema', () => {
    test('FR-027: accepts entityType filter', () => {
      const result = importHistoryQuerySchema.safeParse({ entityType: 'account' });
      expect(result.success).toBe(true);
    });

    test('FR-027: applies default pagination', () => {
      const result = importHistoryQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });
  });
});

describe('FR-029: Data quality schemas', () => {
  describe('qualityDrillDownQuerySchema', () => {
    test('FR-029: accepts valid metrics', () => {
      const metrics = [
        'accountCompleteness',
        'contactEmailValidity',
        'productImages',
        'duplicateAccounts',
        'staleAccounts',
      ];
      for (const metric of metrics) {
        const result = qualityDrillDownQuerySchema.safeParse({ metric });
        expect(result.success).toBe(true);
      }
    });

    test('FR-029: rejects invalid metric', () => {
      const result = qualityDrillDownQuerySchema.safeParse({ metric: 'invalid' });
      expect(result.success).toBe(false);
    });

    test('FR-029: applies default page=1, limit=50', () => {
      const result = qualityDrillDownQuerySchema.safeParse({ metric: 'accountCompleteness' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(50);
      }
    });
  });
});

describe('ADMIN_ERROR_CODES', () => {
  test('exports all expected error codes', () => {
    expect(ADMIN_ERROR_CODES.USER_NOT_FOUND).toBe('USER_NOT_FOUND');
    expect(ADMIN_ERROR_CODES.USER_EMAIL_DUPLICATE).toBe('USER_EMAIL_DUPLICATE');
    expect(ADMIN_ERROR_CODES.USER_SELF_DEACTIVATION).toBe('USER_SELF_DEACTIVATION');
    expect(ADMIN_ERROR_CODES.USER_CONFLICT).toBe('USER_CONFLICT');
    expect(ADMIN_ERROR_CODES.IMPORT_NOT_FOUND).toBe('IMPORT_NOT_FOUND');
    expect(ADMIN_ERROR_CODES.IMPORT_FILE_TOO_LARGE).toBe('IMPORT_FILE_TOO_LARGE');
    expect(ADMIN_ERROR_CODES.IMPORT_INVALID_FORMAT).toBe('IMPORT_INVALID_FORMAT');
    expect(ADMIN_ERROR_CODES.IMPORT_ALREADY_PROCESSING).toBe('IMPORT_ALREADY_PROCESSING');
  });
});
