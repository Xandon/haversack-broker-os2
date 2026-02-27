import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createUser, getUserById, listUsers, updateUser, deactivateUser, AdminError } from './user.service';

// Mock dependencies
vi.mock('../../shared/services/audit.service', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  detectChanges: vi.fn().mockReturnValue([]),
  writeUpdateAuditLogs: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../shared/services/password.service', () => ({
  hashPassword: vi.fn().mockResolvedValue('$2b$12$hashedpassword'),
}));

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const ADMIN_ID = '00000000-0000-4000-a000-000000000099';
const USER_ID = '00000000-0000-4000-a000-000000000050';
const TERRITORY_ID = '00000000-0000-4000-a000-000000000002';

const auditCtx = {
  actorId: ADMIN_ID,
  actorEmail: 'admin@haversack.test',
  requestId: 'req-001',
};

function mockUser(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: USER_ID,
    tenantId: TENANT_ID,
    email: 'rep3@haversack.test',
    passwordHash: '$2b$12$hashedpassword',
    firstName: 'Jane',
    lastName: 'Doe',
    role: 'rep',
    isActive: true,
    avatarUrl: null,
    lastLoginAt: null,
    createdAt: new Date('2026-02-27T00:00:00Z'),
    updatedAt: new Date('2026-02-27T00:00:00Z'),
    deletedAt: null,
    territories: [
      { territory: { id: TERRITORY_ID, name: 'Portland Metro' } },
    ],
    ...overrides,
  };
}

function createMockPrisma(): Record<string, unknown> {
  return {
    user: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    userTerritory: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    refreshToken: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        user: {
          update: vi.fn().mockResolvedValue(mockUser()),
        },
        userTerritory: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
        refreshToken: {
          deleteMany: vi.fn(),
        },
      };
      return fn(tx);
    }),
  };
}

describe('FR-026: User management service', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    vi.clearAllMocks();
  });

  describe('createUser', () => {
    test('FR-026: creates user with valid input and hashed password', async () => {
      (prisma['user'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(null);
      (prisma['user'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue(mockUser());

      const result = await createUser(prisma as never, TENANT_ID, {
        email: 'rep3@haversack.test',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'rep',
        territoryIds: [TERRITORY_ID],
        temporaryPassword: 'TempPass123!',
      }, auditCtx);

      expect(result).toHaveProperty('id', USER_ID);
      expect(result).toHaveProperty('email', 'rep3@haversack.test');
      expect(result).toHaveProperty('role', 'rep');
      expect((prisma['user'] as Record<string, ReturnType<typeof vi.fn>>)['create']).toHaveBeenCalledOnce();
    });

    test('FR-026: rejects duplicate email within tenant', async () => {
      (prisma['user'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(mockUser());

      await expect(
        createUser(prisma as never, TENANT_ID, {
          email: 'rep3@haversack.test',
          firstName: 'Jane',
          lastName: 'Doe',
          role: 'rep',
          territoryIds: [],
          temporaryPassword: 'TempPass123!',
        }, auditCtx),
      ).rejects.toThrow(AdminError);

      try {
        await createUser(prisma as never, TENANT_ID, {
          email: 'rep3@haversack.test',
          firstName: 'Jane',
          lastName: 'Doe',
          role: 'rep',
          territoryIds: [],
          temporaryPassword: 'TempPass123!',
        }, auditCtx);
      } catch (error: unknown) {
        expect((error as AdminError).code).toBe('USER_EMAIL_DUPLICATE');
      }
    });

    test('FR-026: creates user with all five roles', async () => {
      const roles = ['admin', 'manager', 'rep', 'logistics', 'viewer'];
      for (const role of roles) {
        (prisma['user'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(null);
        (prisma['user'] as Record<string, ReturnType<typeof vi.fn>>)['create'].mockResolvedValue(mockUser({ role }));

        const result = await createUser(prisma as never, TENANT_ID, {
          email: `${role}@haversack.test`,
          firstName: 'Test',
          lastName: 'User',
          role: role as 'admin' | 'manager' | 'rep' | 'logistics' | 'viewer',
          territoryIds: [],
          temporaryPassword: 'TempPass123!',
        }, auditCtx);

        expect(result).toHaveProperty('role', role);
      }
    });
  });

  describe('getUserById', () => {
    test('FR-026: returns user with territories', async () => {
      (prisma['user'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(mockUser());

      const result = await getUserById(prisma as never, TENANT_ID, USER_ID);
      expect(result).toHaveProperty('id', USER_ID);
      expect(result).toHaveProperty('territories');
      expect(Array.isArray((result as Record<string, unknown>)['territories'])).toBe(true);
    });

    test('FR-026: throws USER_NOT_FOUND for missing user', async () => {
      (prisma['user'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(null);

      await expect(
        getUserById(prisma as never, TENANT_ID, 'nonexistent-id'),
      ).rejects.toThrow(AdminError);
    });
  });

  describe('listUsers', () => {
    test('FR-026: returns paginated user list', async () => {
      (prisma['user'] as Record<string, ReturnType<typeof vi.fn>>)['findMany'].mockResolvedValue([mockUser()]);
      (prisma['user'] as Record<string, ReturnType<typeof vi.fn>>)['count'].mockResolvedValue(1);

      const result = await listUsers(prisma as never, TENANT_ID, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(1);
    });

    test('FR-026: filters by role', async () => {
      (prisma['user'] as Record<string, ReturnType<typeof vi.fn>>)['findMany'].mockResolvedValue([]);
      (prisma['user'] as Record<string, ReturnType<typeof vi.fn>>)['count'].mockResolvedValue(0);

      await listUsers(prisma as never, TENANT_ID, { role: 'manager', page: 1, limit: 20 });

      const findManyCall = (prisma['user'] as Record<string, ReturnType<typeof vi.fn>>)['findMany'].mock.calls[0] as [{ where: Record<string, unknown> }];
      expect(findManyCall[0].where).toHaveProperty('role', 'manager');
    });

    test('FR-026: filters by isActive status', async () => {
      (prisma['user'] as Record<string, ReturnType<typeof vi.fn>>)['findMany'].mockResolvedValue([]);
      (prisma['user'] as Record<string, ReturnType<typeof vi.fn>>)['count'].mockResolvedValue(0);

      await listUsers(prisma as never, TENANT_ID, { isActive: true, page: 1, limit: 20 });

      const findManyCall = (prisma['user'] as Record<string, ReturnType<typeof vi.fn>>)['findMany'].mock.calls[0] as [{ where: Record<string, unknown> }];
      expect(findManyCall[0].where).toHaveProperty('isActive', true);
    });
  });

  describe('updateUser', () => {
    test('FR-026: updates user role', async () => {
      const existingUser = mockUser();
      (prisma['user'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(existingUser);

      (prisma as Record<string, unknown>)['$transaction'] = vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          user: { update: vi.fn().mockResolvedValue(mockUser({ role: 'manager' })) },
          userTerritory: { deleteMany: vi.fn(), createMany: vi.fn() },
          refreshToken: { deleteMany: vi.fn() },
        };
        return fn(tx);
      });

      const result = await updateUser(
        prisma as never,
        TENANT_ID,
        USER_ID,
        { role: 'manager' },
        undefined,
        auditCtx,
      );

      expect(result).toHaveProperty('role', 'manager');
    });

    test('FR-026: rejects self-deactivation', async () => {
      (prisma['user'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(mockUser({ id: ADMIN_ID }));

      await expect(
        updateUser(prisma as never, TENANT_ID, ADMIN_ID, { isActive: false }, undefined, auditCtx),
      ).rejects.toThrow(AdminError);

      try {
        await updateUser(prisma as never, TENANT_ID, ADMIN_ID, { isActive: false }, undefined, auditCtx);
      } catch (error: unknown) {
        expect((error as AdminError).code).toBe('USER_SELF_DEACTIVATION');
      }
    });

    test('FR-026: rejects optimistic concurrency conflict', async () => {
      (prisma['user'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(
        mockUser({ updatedAt: new Date('2026-02-27T00:00:00Z') }),
      );

      await expect(
        updateUser(
          prisma as never,
          TENANT_ID,
          USER_ID,
          { role: 'manager' },
          '2026-02-26T00:00:00Z', // stale
          auditCtx,
        ),
      ).rejects.toThrow(AdminError);
    });

    test('FR-026: throws USER_NOT_FOUND for missing user', async () => {
      (prisma['user'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(null);

      await expect(
        updateUser(prisma as never, TENANT_ID, USER_ID, { role: 'manager' }, undefined, auditCtx),
      ).rejects.toThrow(AdminError);
    });
  });

  describe('deactivateUser', () => {
    test('AC-026b: deactivates user and invalidates refresh tokens', async () => {
      (prisma['user'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(mockUser());

      const txMock = {
        refreshToken: { deleteMany: vi.fn() },
        user: {
          update: vi.fn().mockResolvedValue(
            mockUser({ isActive: false, deletedAt: new Date('2026-02-27T01:00:00Z') }),
          ),
        },
      };
      (prisma as Record<string, unknown>)['$transaction'] = vi.fn().mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => fn(txMock),
      );

      const result = await deactivateUser(prisma as never, TENANT_ID, USER_ID, auditCtx);

      expect(result).toHaveProperty('isActive', false);
      expect(txMock.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } });
    });

    test('AC-026b: rejects self-deactivation', async () => {
      await expect(
        deactivateUser(prisma as never, TENANT_ID, ADMIN_ID, auditCtx),
      ).rejects.toThrow(AdminError);
    });

    test('FR-026: throws USER_NOT_FOUND for missing user', async () => {
      (prisma['user'] as Record<string, ReturnType<typeof vi.fn>>)['findFirst'].mockResolvedValue(null);

      await expect(
        deactivateUser(prisma as never, TENANT_ID, USER_ID, auditCtx),
      ).rejects.toThrow(AdminError);
    });
  });
});
