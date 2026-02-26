import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { buildTestApp } from '../../shared/test-helpers/app';
import { createMockPrisma, type MockPrismaClient } from '../../shared/test-helpers/db';
import { generateTestToken, authHeader } from '../../shared/test-helpers/auth';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const ASSIGNEE_ID = '00000000-0000-4000-a000-000000000020';
const ACCOUNT_ID = '00000000-0000-4000-a000-000000000030';
const TASK_ID = '00000000-0000-4000-a000-000000000040';
const CREATOR_ID = '00000000-0000-4000-a000-000000000010';

function mockTaskRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: TASK_ID,
    tenantId: TENANT_ID,
    title: 'Follow up with buyer',
    description: 'Discuss Q2 order',
    dueDate: new Date('2026-03-01T10:00:00Z'),
    priority: 'medium',
    status: 'pending',
    assigneeId: ASSIGNEE_ID,
    creatorId: CREATOR_ID,
    accountId: ACCOUNT_ID,
    contactId: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

const validCreatePayload = {
  title: 'Follow up with buyer',
  description: 'Discuss Q2 order',
  dueDate: '2026-03-01T10:00:00.000Z',
  priority: 'medium',
  assigneeId: ASSIGNEE_ID,
  accountId: ACCOUNT_ID,
};

describe('FR-009: Task routes integration', () => {
  let app: FastifyInstance;
  let mockPrisma: MockPrismaClient;
  let repToken: string;
  let viewerToken: string;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    app = await buildTestApp(mockPrisma as unknown as PrismaClient);
    repToken = generateTestToken('rep');
    viewerToken = generateTestToken('viewer');

    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('POST /api/tasks', () => {
    it('creates task with 201', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: ASSIGNEE_ID, isActive: true, tenantId: TENANT_ID });
      mockPrisma.account.findFirst.mockResolvedValue({ id: ACCOUNT_ID, tenantId: TENANT_ID });
      mockPrisma.task.create.mockResolvedValue(mockTaskRecord());

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks',
        headers: authHeader(repToken),
        payload: validCreatePayload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.title).toBe('Follow up with buyer');
    });

    it('returns 401 without auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks',
        payload: validCreatePayload,
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 for viewer role', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks',
        headers: authHeader(viewerToken),
        payload: validCreatePayload,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/tasks', () => {
    it('returns paginated tasks', async () => {
      mockPrisma.task.findMany.mockResolvedValue([mockTaskRecord()]);
      mockPrisma.task.count.mockResolvedValue(1);

      const response = await app.inject({
        method: 'GET',
        url: '/api/tasks',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.pagination.total).toBe(1);
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('returns task by id', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockTaskRecord());

      const response = await app.inject({
        method: 'GET',
        url: `/api/tasks/${TASK_ID}`,
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.id).toBe(TASK_ID);
    });

    it('returns 404 for non-existent task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: `/api/tasks/${TASK_ID}`,
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('updates task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockTaskRecord());
      mockPrisma.task.update.mockResolvedValue(mockTaskRecord({ title: 'Updated' }));

      const response = await app.inject({
        method: 'PUT',
        url: `/api/tasks/${TASK_ID}`,
        headers: authHeader(repToken),
        payload: { title: 'Updated' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.title).toBe('Updated');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('soft-deletes task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockTaskRecord());
      mockPrisma.task.update.mockResolvedValue({ ...mockTaskRecord(), deletedAt: new Date() });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/tasks/${TASK_ID}`,
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
