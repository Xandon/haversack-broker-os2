/**
 * User management service unit tests.
 * T108: Validates user CRUD, role assignment, deactivation,
 * and session invalidation.
 * Tests reference FR-029 and FR-030.
 */
import { describe, expect, test, vi, beforeEach } from 'vitest';

import {
  createUser,
  listUsers,
  getUserById,
  updateUser,
  deactivateUser,
  reactivateUser,
} from './user.service.js';

// Mock auth service
vi.mock('../../auth/auth.service.js', () => ({
  hashPassword: vi.fn().mockResolvedValue('$2b$12$hashed_password_value'),
}));

// Mock audit trail
vi.mock('../../shared/middleware/audit-trail.js', () => ({
  createAuditEntry: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------

function createMockPrisma() {
  return {
    user: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    territory: {
      findFirst: vi.fn(),
    },
    auditTrail: {
      create: vi.fn(),
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockPrisma = ReturnType<typeof createMockPrisma> & Record<string, any>;

const TEST_TENANT_ID = '660e8400-e29b-41d4-a716-446655440000';
const TEST_ADMIN_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_ADMIN_EMAIL = 'admin@haversack.com';
const TEST_USER_ID = 'aae08400-e29b-41d4-a716-446655440001';
const TEST_TERRITORY_ID = 'bbe08400-e29b-41d4-a716-446655440001';

const NOW = new Date('2026-02-25T12:00:00.000Z');

// ---------------------------------------------------------------------------
// Create User Tests (FR-029)
// ---------------------------------------------------------------------------

describe('User Management Service (FR-029)', () => {
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    vi.clearAllMocks();
  });

  describe('createUser', () => {
    test('FR-029: creates user with valid input and hashed password', async () => {
      prisma.user.findFirst.mockResolvedValue(null); // No duplicate email
      prisma.territory.findFirst.mockResolvedValue({ id: TEST_TERRITORY_ID, name: 'Portland' });
      prisma.user.create.mockResolvedValue({
        id: TEST_USER_ID,
        tenant_id: TEST_TENANT_ID,
        email: 'jane@haversack.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'rep',
        territory_id: TEST_TERRITORY_ID,
        is_active: true,
        created_at: NOW,
        territory: { id: TEST_TERRITORY_ID, name: 'Portland' },
      });

      const result = await createUser(prisma, TEST_TENANT_ID, {
        email: 'jane@haversack.com',
        first_name: 'Jane',
        last_name: 'Smith',
        password: 'securePassword123',
        role: 'rep',
        territory_id: TEST_TERRITORY_ID,
      }, TEST_ADMIN_ID, TEST_ADMIN_EMAIL);

      expect(result.email).toBe('jane@haversack.com');
      expect(result.role).toBe('rep');
      expect(result.is_active).toBe(true);
      // Verify password was hashed (not stored in plain text)
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            password_hash: '$2b$12$hashed_password_value',
          }),
        }),
      );
    });

    test('FR-029: rejects duplicate email within same tenant', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'existing-id',
        email: 'jane@haversack.com',
      });

      await expect(
        createUser(prisma, TEST_TENANT_ID, {
          email: 'jane@haversack.com',
          first_name: 'Jane',
          last_name: 'Smith',
          password: 'securePassword123',
          role: 'rep',
          territory_id: TEST_TERRITORY_ID,
        }, TEST_ADMIN_ID, TEST_ADMIN_EMAIL),
      ).rejects.toThrow('A user with this email already exists');
    });

    test('FR-029: requires territory_id when role is rep', async () => {
      await expect(
        createUser(prisma, TEST_TENANT_ID, {
          email: 'jane@haversack.com',
          first_name: 'Jane',
          last_name: 'Smith',
          password: 'securePassword123',
          role: 'rep',
        }, TEST_ADMIN_ID, TEST_ADMIN_EMAIL),
      ).rejects.toThrow('Territory is required for rep role');
    });

    test('FR-029: allows admin role without territory_id', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: TEST_USER_ID,
        tenant_id: TEST_TENANT_ID,
        email: 'admin2@haversack.com',
        first_name: 'Admin',
        last_name: 'Two',
        role: 'admin',
        territory_id: null,
        is_active: true,
        created_at: NOW,
        territory: null,
      });

      const result = await createUser(prisma, TEST_TENANT_ID, {
        email: 'admin2@haversack.com',
        first_name: 'Admin',
        last_name: 'Two',
        password: 'securePassword123',
        role: 'admin',
      }, TEST_ADMIN_ID, TEST_ADMIN_EMAIL);

      expect(result.role).toBe('admin');
      expect(result.territory_id).toBeNull();
    });

    test('FR-029: creates user with all 5 valid roles', async () => {
      const roles = ['admin', 'manager', 'rep', 'logistics', 'viewer'] as const;

      for (const role of roles) {
        prisma.user.findFirst.mockResolvedValue(null);
        prisma.territory.findFirst.mockResolvedValue({ id: TEST_TERRITORY_ID, name: 'Portland' });
        prisma.user.create.mockResolvedValue({
          id: TEST_USER_ID,
          role,
          is_active: true,
          territory: role === 'rep' ? { id: TEST_TERRITORY_ID, name: 'Portland' } : null,
        });

        const result = await createUser(prisma, TEST_TENANT_ID, {
          email: `${role}@haversack.com`,
          first_name: 'Test',
          last_name: 'User',
          password: 'securePassword123',
          role,
          territory_id: role === 'rep' ? TEST_TERRITORY_ID : undefined,
        }, TEST_ADMIN_ID, TEST_ADMIN_EMAIL);

        expect(result.role).toBe(role);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // List Users Tests
  // ---------------------------------------------------------------------------

  describe('listUsers', () => {
    test('FR-029: lists users with pagination', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: '1', email: 'a@test.com', role: 'rep' },
        { id: '2', email: 'b@test.com', role: 'manager' },
      ]);
      prisma.user.count.mockResolvedValue(12);

      const result = await listUsers(prisma, TEST_TENANT_ID, { page: 1, pageSize: 25 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(12);
      expect(result.page).toBe(1);
    });

    test('FR-029: filters users by role', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await listUsers(prisma, TEST_TENANT_ID, { role: 'rep' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'rep' }),
        }),
      );
    });

    test('FR-029: filters users by active status', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await listUsers(prisma, TEST_TENANT_ID, { isActive: true });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ is_active: true }),
        }),
      );
    });

    test('FR-029: searches users by name or email', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await listUsers(prisma, TEST_TENANT_ID, { search: 'jane' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ first_name: expect.objectContaining({ contains: 'jane' }) }),
            ]),
          }),
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Get User Tests
  // ---------------------------------------------------------------------------

  describe('getUserById', () => {
    test('FR-029: returns user by ID with territory', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: TEST_USER_ID,
        email: 'jane@haversack.com',
        role: 'rep',
        territory: { id: TEST_TERRITORY_ID, name: 'Portland' },
      });

      const result = await getUserById(prisma, TEST_TENANT_ID, TEST_USER_ID);

      expect(result).not.toBeNull();
      expect(result!.email).toBe('jane@haversack.com');
    });

    test('FR-029: returns null for non-existent user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await getUserById(prisma, TEST_TENANT_ID, 'non-existent');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Update User Tests (FR-029)
  // ---------------------------------------------------------------------------

  describe('updateUser', () => {
    test('FR-029: updates user role and invalidates refresh token', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: TEST_USER_ID,
        email: 'jane@haversack.com',
        role: 'rep',
        territory_id: TEST_TERRITORY_ID,
        is_active: true,
      });
      prisma.user.update.mockResolvedValue({
        id: TEST_USER_ID,
        email: 'jane@haversack.com',
        role: 'manager',
        territory: null,
      });

      const result = await updateUser(
        prisma, TEST_TENANT_ID, TEST_USER_ID,
        { role: 'manager', territory_id: null },
        TEST_ADMIN_ID, TEST_ADMIN_EMAIL,
      );

      expect(result!.role).toBe('manager');
      // Should invalidate refresh token for role change (FR-029: within 60s)
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ refresh_token_hash: null }),
        }),
      );
    });

    test('FR-029: rejects email update to existing email', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        id: TEST_USER_ID,
        email: 'jane@haversack.com',
        role: 'rep',
        territory_id: TEST_TERRITORY_ID,
      });
      prisma.user.findFirst.mockResolvedValueOnce({
        id: 'other-id',
        email: 'taken@haversack.com',
      });

      await expect(
        updateUser(
          prisma, TEST_TENANT_ID, TEST_USER_ID,
          { email: 'taken@haversack.com' },
          TEST_ADMIN_ID, TEST_ADMIN_EMAIL,
        ),
      ).rejects.toThrow('A user with this email already exists');
    });

    test('FR-029: returns null for non-existent user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await updateUser(
        prisma, TEST_TENANT_ID, 'non-existent',
        { first_name: 'Updated' },
        TEST_ADMIN_ID, TEST_ADMIN_EMAIL,
      );

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Deactivate User Tests (FR-030)
  // ---------------------------------------------------------------------------

  describe('deactivateUser', () => {
    test('FR-030: deactivates user and invalidates all sessions within 15 seconds', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: TEST_USER_ID,
        email: 'jane@haversack.com',
        is_active: true,
        refresh_token_hash: 'some-hash',
      });
      prisma.user.update.mockResolvedValue({
        id: TEST_USER_ID,
        email: 'jane@haversack.com',
        is_active: false,
        refresh_token_hash: null,
        territory: null,
      });

      const result = await deactivateUser(
        prisma, TEST_TENANT_ID, TEST_USER_ID,
        TEST_ADMIN_ID, TEST_ADMIN_EMAIL, 'Left company',
      );

      expect(result!.is_active).toBe(false);
      expect(result!.refresh_token_hash).toBeNull();
      // Verify refresh token was cleared (session invalidation)
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            is_active: false,
            refresh_token_hash: null,
          }),
        }),
      );
    });

    test('FR-030: prevents self-deactivation', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: TEST_ADMIN_ID,
        email: 'admin@haversack.com',
        is_active: true,
      });

      await expect(
        deactivateUser(
          prisma, TEST_TENANT_ID, TEST_ADMIN_ID,
          TEST_ADMIN_ID, TEST_ADMIN_EMAIL,
        ),
      ).rejects.toThrow('Cannot deactivate your own account');
    });

    test('FR-030: rejects deactivation of already deactivated user', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: TEST_USER_ID,
        email: 'jane@haversack.com',
        is_active: false,
      });

      await expect(
        deactivateUser(
          prisma, TEST_TENANT_ID, TEST_USER_ID,
          TEST_ADMIN_ID, TEST_ADMIN_EMAIL,
        ),
      ).rejects.toThrow('User is already deactivated');
    });

    test('FR-030: returns null for non-existent user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await deactivateUser(
        prisma, TEST_TENANT_ID, 'non-existent',
        TEST_ADMIN_ID, TEST_ADMIN_EMAIL,
      );

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Reactivate User Tests (FR-029)
  // ---------------------------------------------------------------------------

  describe('reactivateUser', () => {
    test('FR-029: reactivates a deactivated user', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: TEST_USER_ID,
        email: 'jane@haversack.com',
        is_active: false,
      });
      prisma.user.update.mockResolvedValue({
        id: TEST_USER_ID,
        email: 'jane@haversack.com',
        is_active: true,
        territory: null,
      });

      const result = await reactivateUser(
        prisma, TEST_TENANT_ID, TEST_USER_ID,
        TEST_ADMIN_ID, TEST_ADMIN_EMAIL,
      );

      expect(result!.is_active).toBe(true);
    });

    test('FR-029: rejects reactivation of already active user', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: TEST_USER_ID,
        email: 'jane@haversack.com',
        is_active: true,
      });

      await expect(
        reactivateUser(
          prisma, TEST_TENANT_ID, TEST_USER_ID,
          TEST_ADMIN_ID, TEST_ADMIN_EMAIL,
        ),
      ).rejects.toThrow('User is already active');
    });
  });
});
