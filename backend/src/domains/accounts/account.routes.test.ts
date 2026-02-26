import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { buildTestApp } from '../../shared/test-helpers/app';
import { createMockPrisma, type MockPrismaClient } from '../../shared/test-helpers/db';
import { generateTestToken, authHeader } from '../../shared/test-helpers/auth';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const TERRITORY_ID = '00000000-0000-4000-a000-000000000002';
const ACCOUNT_ID = '00000000-0000-4000-a000-000000000010';
const CONTACT_ID = '00000000-0000-4000-a000-000000000020';

function mockAccountRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: ACCOUNT_ID,
    tenantId: TENANT_ID,
    name: 'Pacific Bistro',
    accountType: 'restaurant',
    streetAddress: '123 Main St',
    city: 'Portland',
    state: 'OR',
    zipCode: '97201',
    territoryId: TERRITORY_ID,
    parentAccountId: null,
    healthScore: null,
    healthScoreCalculatedAt: null,
    isActive: true,
    createdAt: new Date('2026-02-26T00:00:00Z'),
    updatedAt: new Date('2026-02-26T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  };
}

function mockAccountWithRelations(): Record<string, unknown> {
  return {
    ...mockAccountRecord(),
    territory: { id: TERRITORY_ID, name: 'Portland Metro' },
    parentAccount: null,
    childAccounts: [],
    contacts: [
      {
        id: CONTACT_ID,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@pacific.com',
        phone: '503-555-1234',
        title: 'Owner',
        isPrimary: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };
}

const validCreatePayload = {
  name: 'Pacific Bistro',
  accountType: 'restaurant',
  streetAddress: '123 Main St',
  city: 'Portland',
  state: 'OR',
  zipCode: '97201',
  territoryId: TERRITORY_ID,
  primaryContact: {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@pacific.com',
    phone: '503-555-1234',
  },
};

describe('FR-001: Account routes integration', () => {
  let app: FastifyInstance;
  let mockPrisma: MockPrismaClient;
  let repToken: string;
  let viewerToken: string;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    app = await buildTestApp(mockPrisma as unknown as PrismaClient);
    repToken = generateTestToken('rep');
    viewerToken = generateTestToken('viewer');

    // Default audit log mock
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('POST /api/accounts', () => {
    it('US1-AC1: creates account with 201 for authenticated rep', async () => {
      // No duplicates found
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      mockPrisma.account.create.mockResolvedValue(mockAccountRecord());

      const response = await app.inject({
        method: 'POST',
        url: '/api/accounts',
        headers: authHeader(repToken),
        payload: validCreatePayload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.name).toBe('Pacific Bistro');
    });

    it('US1-AC2: returns 400 for blank account name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/accounts',
        headers: authHeader(repToken),
        payload: { ...validCreatePayload, name: '' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('US1-AC4: returns 409 when duplicates detected', async () => {
      // Duplicate found
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { id: 'dup-1', name: 'Pacific Bistros', distance: 1 },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/accounts',
        headers: authHeader(repToken),
        payload: validCreatePayload,
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('ACCOUNT_DUPLICATE_DETECTED');
      expect(body.duplicates).toBeDefined();
    });

    it('US1-AC5: creates despite duplicates when skipDuplicateCheck is true', async () => {
      mockPrisma.account.create.mockResolvedValue(mockAccountRecord());

      const response = await app.inject({
        method: 'POST',
        url: '/api/accounts',
        headers: authHeader(repToken),
        payload: { ...validCreatePayload, skipDuplicateCheck: true },
      });

      expect(response.statusCode).toBe(201);
    });

    it('returns 401 without auth token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/accounts',
        payload: validCreatePayload,
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 403 for viewer role', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/accounts',
        headers: authHeader(viewerToken),
        payload: validCreatePayload,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/accounts', () => {
    it('FR-001: returns paginated account list', async () => {
      mockPrisma.account.findMany.mockResolvedValue([mockAccountRecord()]);
      mockPrisma.account.count.mockResolvedValue(1);

      const response = await app.inject({
        method: 'GET',
        url: '/api/accounts',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.pagination).toBeDefined();
    });

    it('FR-003: searches accounts when search query provided', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce([{ ...mockAccountRecord(), relevance_rank: 1 }]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/accounts?search=pacific',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
    });

    it('FR-003: returns 400 for search query under 3 chars', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/accounts?search=ab',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/accounts/:id', () => {
    it('US2-AC1: returns account detail with contacts', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(mockAccountWithRelations());

      const response = await app.inject({
        method: 'GET',
        url: `/api/accounts/${ACCOUNT_ID}`,
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.name).toBe('Pacific Bistro');
      expect(body.data.contacts).toHaveLength(1);
    });

    it('returns 404 for nonexistent account', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: `/api/accounts/${ACCOUNT_ID}`,
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/accounts/:id', () => {
    it('US6-AC1: updates account fields', async () => {
      const existing = mockAccountRecord();
      const updated = mockAccountRecord({ name: 'Updated Bistro' });
      mockPrisma.account.findFirst.mockResolvedValue(existing);
      mockPrisma.account.update.mockResolvedValue(updated);

      const response = await app.inject({
        method: 'PUT',
        url: `/api/accounts/${ACCOUNT_ID}`,
        headers: authHeader(repToken),
        payload: { name: 'Updated Bistro' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.name).toBe('Updated Bistro');
    });

    it('returns 409 for concurrent edit conflict', async () => {
      const existing = mockAccountRecord({ updatedAt: new Date('2026-02-26T00:00:00Z') });
      mockPrisma.account.findFirst.mockResolvedValue(existing);

      const response = await app.inject({
        method: 'PUT',
        url: `/api/accounts/${ACCOUNT_ID}`,
        headers: {
          ...authHeader(repToken),
          'if-match': '2026-02-25T00:00:00Z',
        },
        payload: { name: 'Updated' },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('DELETE /api/accounts/:id', () => {
    it('US6-AC2: soft-deletes account', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(mockAccountRecord());
      mockPrisma.account.update.mockResolvedValue({});

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/accounts/${ACCOUNT_ID}`,
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.deletedAt).toBeDefined();
    });
  });

  describe('GET /api/accounts/check-duplicates', () => {
    it('FR-005: checks for duplicates', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/accounts/check-duplicates?name=Pacific+Bistro',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.hasDuplicates).toBe(false);
    });
  });

  describe('POST /api/accounts/:id/contacts', () => {
    it('US7-AC1: creates contact linked to account', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(mockAccountRecord());
      mockPrisma.contact.create.mockResolvedValue({
        id: CONTACT_ID,
        tenantId: TENANT_ID,
        accountId: ACCOUNT_ID,
        firstName: 'John',
        lastName: 'Smith',
        email: 'john@example.com',
        phone: null,
        title: null,
        isPrimary: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      const response = await app.inject({
        method: 'POST',
        url: `/api/accounts/${ACCOUNT_ID}/contacts`,
        headers: authHeader(repToken),
        payload: {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@example.com',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.firstName).toBe('John');
    });
  });

  describe('PUT /api/accounts/:id/contacts/:contactId', () => {
    it('US7-AC2: updates contact', async () => {
      const existing = {
        id: CONTACT_ID,
        tenantId: TENANT_ID,
        accountId: ACCOUNT_ID,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        phone: null,
        title: null,
        isPrimary: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      mockPrisma.contact.findFirst.mockResolvedValue(existing);
      mockPrisma.contact.update.mockResolvedValue({ ...existing, email: 'updated@example.com' });

      const response = await app.inject({
        method: 'PUT',
        url: `/api/accounts/${ACCOUNT_ID}/contacts/${CONTACT_ID}`,
        headers: authHeader(repToken),
        payload: { email: 'updated@example.com' },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('DELETE /api/accounts/:id/contacts/:contactId', () => {
    it('US7-AC3: soft-deletes contact', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: CONTACT_ID,
        tenantId: TENANT_ID,
        accountId: ACCOUNT_ID,
        deletedAt: null,
      });
      mockPrisma.contact.update.mockResolvedValue({});

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/accounts/${ACCOUNT_ID}/contacts/${CONTACT_ID}`,
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.deletedAt).toBeDefined();
    });
  });
});
