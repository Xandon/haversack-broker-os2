import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { buildTestApp } from '../../shared/test-helpers/app';
import { createMockPrisma, type MockPrismaClient } from '../../shared/test-helpers/db';
import { generateTestToken, authHeader } from '../../shared/test-helpers/auth';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const USER_ID = '00000000-0000-4000-a000-000000000050';
const TERRITORY_ID = '00000000-0000-4000-a000-000000000002';
const ADMIN_USER_ID = '00000000-0000-4000-a000-000000000010';

function mockUserRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: USER_ID,
    tenantId: TENANT_ID,
    email: 'rep3@haversack.test',
    passwordHash: '$2b$12$hashed',
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

const validCreatePayload = {
  email: 'rep3@haversack.test',
  firstName: 'Jane',
  lastName: 'Doe',
  role: 'rep',
  territoryIds: [TERRITORY_ID],
  temporaryPassword: 'TempPass123!',
};

describe('FR-026: Admin user routes integration', () => {
  let app: FastifyInstance;
  let mockPrisma: MockPrismaClient;
  let adminToken: string;
  let repToken: string;
  let managerToken: string;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    app = await buildTestApp(mockPrisma as unknown as PrismaClient);
    adminToken = generateTestToken('admin', { userId: ADMIN_USER_ID });
    repToken = generateTestToken('rep');
    managerToken = generateTestToken('manager');

    // Default mocks
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('POST /api/admin/users', () => {
    it('FR-026: creates user with 201 for admin', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null); // no duplicate
      mockPrisma.user.create.mockResolvedValue(mockUserRecord());

      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: authHeader(adminToken),
        payload: validCreatePayload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as { data: Record<string, unknown> };
      expect(body.data).toHaveProperty('id', USER_ID);
      expect(body.data).toHaveProperty('role', 'rep');
    });

    it('FR-026: returns 409 for duplicate email', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUserRecord()); // duplicate found

      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: authHeader(adminToken),
        payload: validCreatePayload,
      });

      expect(response.statusCode).toBe(409);
    });

    it('FR-026: returns 403 for non-admin (rep)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: authHeader(repToken),
        payload: validCreatePayload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('FR-026: returns 403 for non-admin (manager)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: authHeader(managerToken),
        payload: validCreatePayload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('FR-026: returns 401 for unauthenticated', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        payload: validCreatePayload,
      });

      expect(response.statusCode).toBe(401);
    });

    it('FR-026: returns 400 for invalid payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: authHeader(adminToken),
        payload: { email: 'not-valid' }, // missing required fields
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/admin/users', () => {
    it('FR-026: lists users for admin with pagination', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUserRecord()]);
      mockPrisma.user.count.mockResolvedValue(1);

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/users',
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { data: unknown[]; meta: Record<string, number> };
      expect(body.data).toHaveLength(1);
      expect(body.meta).toHaveProperty('total', 1);
    });

    it('FR-026: returns 403 for non-admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/users',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/admin/users/:id', () => {
    it('FR-026: returns user detail for admin', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUserRecord());

      const response = await app.inject({
        method: 'GET',
        url: `/api/admin/users/${USER_ID}`,
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { data: Record<string, unknown> };
      expect(body.data).toHaveProperty('id', USER_ID);
    });

    it('FR-026: returns 404 for nonexistent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: `/api/admin/users/nonexistent-id`,
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/admin/users/:id', () => {
    it('AC-026a: updates user role from rep to manager', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUserRecord());
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          user: { update: vi.fn().mockResolvedValue(mockUserRecord({ role: 'manager' })) },
          userTerritory: { deleteMany: vi.fn(), createMany: vi.fn() },
          refreshToken: { deleteMany: vi.fn() },
        };
        return fn(tx);
      });

      const response = await app.inject({
        method: 'PUT',
        url: `/api/admin/users/${USER_ID}`,
        headers: authHeader(adminToken),
        payload: { role: 'manager' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { data: Record<string, unknown> };
      expect(body.data).toHaveProperty('role', 'manager');
    });

    it('FR-026: returns 400 for self-deactivation', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUserRecord({ id: ADMIN_USER_ID }));

      const response = await app.inject({
        method: 'PUT',
        url: `/api/admin/users/${ADMIN_USER_ID}`,
        headers: authHeader(adminToken),
        payload: { isActive: false },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('AC-026b: deactivates user and invalidates sessions', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUserRecord());
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          refreshToken: { deleteMany: vi.fn() },
          user: {
            update: vi.fn().mockResolvedValue(
              mockUserRecord({ isActive: false, deletedAt: new Date() }),
            ),
          },
        };
        return fn(tx);
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/admin/users/${USER_ID}`,
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as { data: Record<string, unknown> };
      expect(body.data).toHaveProperty('isActive', false);
    });

    it('FR-026: rejects self-deactivation via DELETE', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/admin/users/${ADMIN_USER_ID}`,
        headers: authHeader(adminToken),
      });

      expect(response.statusCode).toBe(400);
    });

    it('FR-026: returns 403 for non-admin', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/admin/users/${USER_ID}`,
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
