/**
 * Account route handler unit tests.
 * T048: Account route tests — validates HTTP endpoints with mocked services.
 * Uses mocked auth middleware and account service to test route logic.
 */
import { describe, expect, test, vi, beforeEach } from 'vitest';

import type { FastifyInstance } from 'fastify';

// Mock auth middleware before importing routes
vi.mock('../../auth/rbac.middleware.js', () => ({
  extractUser: vi.fn(async (request: Record<string, unknown>, _reply: unknown): Promise<void> => {
    // Simulate authenticated user attached by extractUser
    request['user'] = {
      userId: '550e8400-e29b-41d4-a716-446655440000',
      tenantId: '660e8400-e29b-41d4-a716-446655440000',
      role: 'admin',
      email: 'admin@haversack.com',
    };
  }),
  requireRole: vi.fn(
    () =>
      async (_request: unknown, _reply: unknown): Promise<void> => {
        // Allow all roles in tests
      },
  ),
}));

// Mock account service
vi.mock('./account.service.js', () => ({
  createAccount: vi.fn(),
  getAccountById: vi.fn(),
  listAccounts: vi.fn(),
  updateAccount: vi.fn(),
}));

// Mock duplicate detection service
vi.mock('./duplicate-detection.service.js', () => ({
  findDuplicates: vi.fn(),
}));

// Dynamic imports after mocks are set up
const { createAccount, getAccountById, listAccounts, updateAccount } = await import(
  './account.service.js'
);
const { findDuplicates } = await import('./duplicate-detection.service.js');
const { accountRoutes } = await import('./account.routes.js');

const TEST_TENANT_ID = '660e8400-e29b-41d4-a716-446655440000';
const TEST_TERRITORY_ID = '770e8400-e29b-41d4-a716-446655440000';
const TEST_REP_ID = '880e8400-e29b-41d4-a716-446655440000';

const VALID_ACCOUNT_BODY = {
  name: 'Portland Natural Foods',
  account_type: 'store',
  address_line1: '123 Main St',
  city: 'Portland',
  state: 'OR',
  zip_code: '97201',
  territory_id: TEST_TERRITORY_ID,
  assigned_rep_id: TEST_REP_ID,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function buildTestApp(): Promise<FastifyInstance> {
  // Use dynamic import to avoid hoisting issues
  const Fastify = (await import('fastify')).default;
  const { ZodError } = await import('zod');

  const app = Fastify({ logger: false });

  // Register a minimal error handler for Zod errors
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      void reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        requestId: request.requestId ?? 'unknown',
        details: error.issues,
      });
      return;
    }
    void reply.status(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: error.message,
      code: 'INTERNAL_SERVER_ERROR',
      requestId: request.requestId ?? 'unknown',
    });
  });

  // Decorate with mock prisma
  app.decorate('prisma', {});

  await app.register(accountRoutes);
  await app.ready();
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Account Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildTestApp();
  });

  describe('POST /api/accounts', () => {
    test('FR-001: POST /api/accounts returns 201 with valid input', async () => {
      const mockAccount = {
        id: 'new-account-id',
        tenant_id: TEST_TENANT_ID,
        ...VALID_ACCOUNT_BODY,
        address_line2: null,
        phone: null,
        email: null,
        website: null,
        parent_account_id: null,
        notes: null,
        tags: [],
        health_score: null,
        metadata: {},
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };

      vi.mocked(createAccount).mockResolvedValue({
        account: mockAccount as Parameters<typeof vi.mocked>[0],
        duplicates: [],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/accounts',
        payload: VALID_ACCOUNT_BODY,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.id).toBe('new-account-id');
      expect(body.data.name).toBe('Portland Natural Foods');
      expect(body.duplicates).toEqual([]);
    });

    test('FR-002: POST /api/accounts returns 400 for invalid input', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/accounts',
        payload: {
          // Missing required fields: name, address_line1, city, state, zip_code, etc.
          account_type: 'store',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    test('FR-002: POST /api/accounts returns 400 for missing name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/accounts',
        payload: {
          ...VALID_ACCOUNT_BODY,
          name: '', // Empty name should fail min(1) validation
        },
      });

      expect(response.statusCode).toBe(400);
    });

    test('FR-002: POST /api/accounts returns 400 for invalid account_type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/accounts',
        payload: {
          ...VALID_ACCOUNT_BODY,
          account_type: 'invalid_type',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    test('FR-002: POST /api/accounts returns 400 for invalid territory_id', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/accounts',
        payload: {
          ...VALID_ACCOUNT_BODY,
          territory_id: 'not-a-uuid',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/accounts', () => {
    test('FR-001: GET /api/accounts returns 200 with paginated list', async () => {
      vi.mocked(listAccounts).mockResolvedValue({
        items: [{ id: '1', name: 'Test Account' }] as Parameters<typeof vi.mocked>[0],
        total: 1,
        page: 1,
        pageSize: 20,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/accounts',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toHaveLength(1);
      expect(body.pagination.total).toBe(1);
      expect(body.pagination.page).toBe(1);
    });

    test('FR-001: GET /api/accounts passes query parameters as filters', async () => {
      vi.mocked(listAccounts).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
      });

      await app.inject({
        method: 'GET',
        url: `/api/accounts?territory_id=${TEST_TERRITORY_ID}&account_type=store&page=2&page_size=10&search=Portland`,
      });

      expect(listAccounts).toHaveBeenCalledWith(
        expect.anything(),
        TEST_TENANT_ID,
        {
          territoryId: TEST_TERRITORY_ID,
          accountType: 'store',
          search: 'Portland',
          isActive: undefined,
          page: 2,
          pageSize: 10,
        },
      );
    });
  });

  describe('GET /api/accounts/:id', () => {
    test('FR-001: GET /api/accounts/:id returns 200 when found', async () => {
      vi.mocked(getAccountById).mockResolvedValue({
        id: 'account-id',
        name: 'Test Account',
        contacts: [],
      } as Parameters<typeof vi.mocked>[0]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/accounts/account-id',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.id).toBe('account-id');
    });

    test('FR-001: GET /api/accounts/:id returns 404 when not found', async () => {
      vi.mocked(getAccountById).mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/accounts/nonexistent-id',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/accounts/:id', () => {
    test('FR-001: PUT /api/accounts/:id returns 200 with updated data', async () => {
      vi.mocked(updateAccount).mockResolvedValue({
        id: 'account-id',
        name: 'Updated Name',
      } as Parameters<typeof vi.mocked>[0]);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/accounts/account-id',
        payload: { name: 'Updated Name' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.name).toBe('Updated Name');
    });

    test('FR-001: PUT /api/accounts/:id returns 404 when not found', async () => {
      vi.mocked(updateAccount).mockResolvedValue(null);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/accounts/nonexistent-id',
        payload: { name: 'Updated Name' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/accounts/check-duplicates', () => {
    test('FR-003: POST /api/accounts/check-duplicates returns matches with confidence', async () => {
      vi.mocked(findDuplicates).mockResolvedValue([
        {
          account: {
            id: 'dup-id',
            name: 'Portland Natural Foods',
            phone: null,
            address_line1: '123 Main St',
            city: 'Portland',
            state: 'OR',
            zip_code: '97201',
          },
          confidence: 0.92,
          matchedFields: [{ field: 'name', score: 0.95 }],
        },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/accounts/check-duplicates',
        payload: VALID_ACCOUNT_BODY,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.hasDuplicates).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].confidence).toBe(0.92);
      expect(body.data[0].matchedFields[0].field).toBe('name');
    });

    test('FR-003: POST /api/accounts/check-duplicates returns empty when no duplicates', async () => {
      vi.mocked(findDuplicates).mockResolvedValue([]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/accounts/check-duplicates',
        payload: VALID_ACCOUNT_BODY,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.hasDuplicates).toBe(false);
      expect(body.data).toHaveLength(0);
    });

    test('FR-003: POST /api/accounts/check-duplicates returns 400 for invalid input', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/accounts/check-duplicates',
        payload: { name: '' }, // Invalid: empty name and missing required fields
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
