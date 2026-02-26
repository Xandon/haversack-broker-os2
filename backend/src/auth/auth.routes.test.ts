import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildTestApp } from '../shared/test-helpers/app';
import { createMockPrisma, type MockPrismaClient } from '../shared/test-helpers/db';
import { generateTestToken, authHeader } from '../shared/test-helpers/auth';
import { hashPassword } from '../shared/services/password.service';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';

describe('FR-F001: Auth routes integration', () => {
  let app: FastifyInstance;
  let mockPrisma: MockPrismaClient;

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    tenantId: '00000000-0000-4000-a000-000000000001',
    email: 'rep@haversack.test',
    passwordHash: '',
    firstName: 'Test',
    lastName: 'Rep',
    role: 'rep',
    isActive: true,
    deletedAt: null,
  };

  beforeAll(async () => {
    mockUser.passwordHash = await hashPassword('TestPassword123!');
  });

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    app = await buildTestApp(mockPrisma as unknown as PrismaClient);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('POST /api/auth/login', () => {
    it('US2-AC1: returns 200 with tokens for valid credentials', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'token-id' });
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'rep@haversack.test',
          password: 'TestPassword123!',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.user.email).toBe('rep@haversack.test');
      expect(body.user.role).toBe('rep');
    });

    it('US2-AC2: returns 401 for invalid credentials', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nobody@haversack.test',
          password: 'WrongPassword!',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('UNAUTHORIZED');
      expect(body.code).toBe('AUTH_INVALID_CREDENTIALS');
      expect(body.requestId).toBeDefined();
    });

    it('US6-AC5: returns 400 for invalid request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'not-an-email',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.details).toBeDefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('US2-AC6: returns 200 for authenticated user', async () => {
      const token = generateTestToken('rep');
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: authHeader(token),
      });

      expect(response.statusCode).toBe(200);
    });

    it('US3-AC3: returns 401 without auth token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('AUTH_MISSING_TOKEN');
    });
  });

  describe('GET /api/health', () => {
    it('returns 200 health check', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
    });
  });

  describe('404 handler', () => {
    it('US6-AC1: returns structured 404 for unknown routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/nonexistent',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('NOT_FOUND');
      expect(body.code).toBe('ROUTE_NOT_FOUND');
      expect(body.requestId).toBeDefined();
    });
  });

  describe('X-Request-Id header', () => {
    it('US6-AC4: all responses include X-Request-Id header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(response.headers['x-request-id']).toBeDefined();
    });
  });
});
