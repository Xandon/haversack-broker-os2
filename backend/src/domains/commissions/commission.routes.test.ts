import { describe, test, expect, beforeEach } from 'vitest';
import { buildTestApp } from '../../shared/test-helpers/app';
import { createMockPrisma, type MockPrismaClient } from '../../shared/test-helpers/db';
import { generateTestToken, authHeader } from '../../shared/test-helpers/auth';
import type { FastifyInstance } from 'fastify';
import { Decimal } from '@prisma/client/runtime/library';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';

const MOCK_RULE = {
  id: 'rule-1',
  tenantId: TENANT_ID,
  brandId: 'brand-1',
  territoryId: null,
  baseRate: new Decimal('0.10'),
  territoryModifier: new Decimal('1.00'),
  volumeTiers: [{ minAmount: 0, maxAmount: null, bonusRate: 0.01 }],
  effectiveDate: new Date('2026-01-01'),
  expiresAt: null,
  isActive: true,
  version: 1,
  createdBy: 'admin-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  brand: { id: 'brand-1', name: 'Mountain Meadow' },
  territory: null,
};

const MOCK_STATEMENT = {
  id: 'stmt-1',
  tenantId: TENANT_ID,
  repId: '00000000-0000-4000-a000-000000000010',
  month: 3,
  year: 2026,
  status: 'pending',
  totalEarned: new Decimal('1500.00'),
  ytdTotal: new Decimal('4500.00'),
  approvedBy: null,
  approvedAt: null,
  exportedAt: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  rep: { id: '00000000-0000-4000-a000-000000000010', firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com' },
  approver: null,
  entries: [],
  disputes: [],
};

const MOCK_ENTRY = {
  id: 'entry-1',
  tenantId: TENANT_ID,
  orderId: 'order-1',
  orderLineItemId: 'item-1',
  repId: '00000000-0000-4000-a000-000000000010',
  commissionRuleId: 'rule-1',
  entryType: 'calculation',
  baseRate: new Decimal('0.10'),
  territoryModifier: new Decimal('1.00'),
  volumeTierApplied: 'tier 1: 0-null (+1.0%)',
  effectiveRate: new Decimal('0.11'),
  lineItemTotal: new Decimal('12000.00'),
  commissionAmount: new Decimal('1320.00'),
  calculatedAt: new Date(),
  statementId: 'stmt-1',
};

const MOCK_DISPUTE = {
  id: 'dispute-1',
  tenantId: TENANT_ID,
  statementId: 'stmt-1',
  commissionEntryId: 'entry-1',
  filedBy: '00000000-0000-4000-a000-000000000010',
  reason: 'Incorrect rate applied',
  status: 'open',
  originalAmount: new Decimal('1320.00'),
  adjustedAmount: null,
  resolvedBy: null,
  resolvedAt: null,
  resolutionNotes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  commissionEntry: { id: 'entry-1', orderId: 'order-1', commissionAmount: new Decimal('1320.00'), statementId: 'stmt-1' },
  filer: { id: '00000000-0000-4000-a000-000000000010', firstName: 'Jane', lastName: 'Smith' },
  resolver: null,
};

const MOCK_EXPORT = {
  id: 'export-1',
  tenantId: TENANT_ID,
  referenceId: 'QB-2026-03-001',
  month: 3,
  year: 2026,
  format: 'csv',
  status: 'completed',
  fileContent: 'Rep Name,Rep Email,Period,Order Count,Total Commission\n"Jane Smith","jane@test.com","2026-03",0,1500.00',
  createdBy: '00000000-0000-4000-a000-000000000010',
  createdAt: new Date(),
  creator: { id: '00000000-0000-4000-a000-000000000010', firstName: 'Admin', lastName: 'User', email: 'admin@test.com' },
  statements: [{ id: 'stmt-1', repId: '00000000-0000-4000-a000-000000000010', month: 3, year: 2026, totalEarned: new Decimal('1500.00') }],
};

const VALID_RULE_PAYLOAD = {
  brandId: '00000000-0000-4000-a000-000000000099',
  baseRate: 0.10,
  territoryModifier: 1.0,
  volumeTiers: [{ minAmount: 0, maxAmount: null, bonusRate: 0.01 }],
  effectiveDate: '2026-01-01',
};

const VALID_UPDATE_RULE_PAYLOAD = {
  baseRate: 0.12,
  effectiveDate: '2026-04-01',
};

describe('FR-012/FR-013: Commission routes', () => {
  let app: FastifyInstance;
  let mockPrisma: MockPrismaClient;
  let adminToken: string;
  let managerToken: string;
  let repToken: string;
  let viewerToken: string;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();

    // Default mock implementations
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma));
    mockPrisma.auditLog.create.mockResolvedValue({});

    // Commission rule defaults
    mockPrisma.commissionRule.findFirst.mockResolvedValue(null);
    mockPrisma.commissionRule.findMany.mockResolvedValue([MOCK_RULE]);
    mockPrisma.commissionRule.create.mockResolvedValue(MOCK_RULE);
    mockPrisma.commissionRule.update.mockResolvedValue(MOCK_RULE);
    mockPrisma.commissionRule.count.mockResolvedValue(1);

    // Commission statement defaults
    mockPrisma.commissionStatement.findFirst.mockResolvedValue(MOCK_STATEMENT);
    mockPrisma.commissionStatement.findMany.mockResolvedValue([MOCK_STATEMENT]);
    mockPrisma.commissionStatement.create.mockResolvedValue(MOCK_STATEMENT);
    mockPrisma.commissionStatement.update.mockResolvedValue({ ...MOCK_STATEMENT, status: 'approved' });
    mockPrisma.commissionStatement.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.commissionStatement.count.mockResolvedValue(1);

    // Commission entry defaults
    mockPrisma.commissionEntry.findFirst.mockResolvedValue(MOCK_ENTRY);
    mockPrisma.commissionEntry.findMany.mockResolvedValue([]);
    mockPrisma.commissionEntry.aggregate.mockResolvedValue({ _sum: { commissionAmount: new Decimal('1500.00') } });
    mockPrisma.commissionEntry.updateMany.mockResolvedValue({ count: 1 });

    // Commission dispute defaults
    mockPrisma.commissionDispute.findFirst.mockResolvedValue(null);
    mockPrisma.commissionDispute.create.mockResolvedValue(MOCK_DISPUTE);
    mockPrisma.commissionDispute.update.mockResolvedValue({ ...MOCK_DISPUTE, status: 'resolved' });

    // Commission export defaults
    mockPrisma.commissionExport.findFirst.mockResolvedValue(null);
    mockPrisma.commissionExport.create.mockResolvedValue(MOCK_EXPORT);
    mockPrisma.commissionExport.count.mockResolvedValue(0);

    // User defaults (for generateStatements)
    mockPrisma.user.findMany.mockResolvedValue([]);

    app = await buildTestApp(mockPrisma);
    adminToken = generateTestToken('admin');
    managerToken = generateTestToken('manager');
    repToken = generateTestToken('rep');
    viewerToken = generateTestToken('viewer');
  });

  // ─── RBAC Tests (T156) ──────────────────────────────────────

  describe('RBAC enforcement (T156)', () => {
    test('T156: RBAC: admin can create commission rule', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/rules',
        headers: authHeader(adminToken),
        payload: VALID_RULE_PAYLOAD,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.data.brandName).toBe('Mountain Meadow');
    });

    test('T156: RBAC: rep cannot create commission rule', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/rules',
        headers: authHeader(repToken),
        payload: VALID_RULE_PAYLOAD,
      });

      expect(response.statusCode).toBe(403);
    });

    test('T156: RBAC: viewer cannot create commission rule', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/rules',
        headers: authHeader(viewerToken),
        payload: VALID_RULE_PAYLOAD,
      });

      expect(response.statusCode).toBe(403);
    });

    test('T156: RBAC: admin can update commission rule', async () => {
      mockPrisma.commissionRule.findFirst.mockResolvedValue(MOCK_RULE);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/commissions/rules/rule-1',
        headers: authHeader(adminToken),
        payload: VALID_UPDATE_RULE_PAYLOAD,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
    });

    test('T156: RBAC: any authenticated user can list rules', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/commissions/rules',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.pagination).toBeDefined();
    });

    test('T156: RBAC: admin can generate statements', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/statements/generate',
        headers: authHeader(adminToken),
        payload: { month: 3, year: 2026 },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.count).toBeDefined();
    });

    test('T156: RBAC: rep cannot generate statements', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/statements/generate',
        headers: authHeader(repToken),
        payload: { month: 3, year: 2026 },
      });

      expect(response.statusCode).toBe(403);
    });

    test('T156: RBAC: manager can approve statement', async () => {
      mockPrisma.commissionStatement.findFirst.mockResolvedValue({
        ...MOCK_STATEMENT,
        status: 'pending',
        disputes: [],
      });
      mockPrisma.commissionStatement.update.mockResolvedValue({
        ...MOCK_STATEMENT,
        status: 'approved',
        approvedBy: '00000000-0000-4000-a000-000000000010',
        approvedAt: new Date(),
        approver: { id: '00000000-0000-4000-a000-000000000010', firstName: 'Manager', lastName: 'User' },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/statements/stmt-1/approve',
        headers: authHeader(managerToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
    });

    test('T156: RBAC: rep cannot approve statement', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/statements/stmt-1/approve',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(403);
    });

    test('T156: RBAC: rep can file dispute', async () => {
      mockPrisma.commissionEntry.findFirst.mockResolvedValue(MOCK_ENTRY);
      mockPrisma.commissionDispute.findFirst.mockResolvedValue(null);
      mockPrisma.commissionDispute.create.mockResolvedValue(MOCK_DISPUTE);

      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/entries/entry-1/dispute',
        headers: authHeader(repToken),
        payload: { reason: 'Incorrect rate applied' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.data.reason).toBe('Incorrect rate applied');
    });

    test('T156: RBAC: viewer cannot file dispute', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/entries/entry-1/dispute',
        headers: authHeader(viewerToken),
        payload: { reason: 'Incorrect rate' },
      });

      expect(response.statusCode).toBe(403);
    });

    test('T156: RBAC: admin can trigger export', async () => {
      mockPrisma.commissionExport.findFirst.mockResolvedValue(null);
      mockPrisma.commissionStatement.findMany.mockResolvedValue([{
        ...MOCK_STATEMENT,
        status: 'approved',
        rep: MOCK_STATEMENT.rep,
        entries: [],
      }]);
      mockPrisma.commissionExport.count.mockResolvedValue(0);
      mockPrisma.commissionExport.create.mockResolvedValue(MOCK_EXPORT);
      mockPrisma.commissionStatement.updateMany.mockResolvedValue({ count: 1 });

      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/export',
        headers: authHeader(adminToken),
        payload: { month: 3, year: 2026 },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.csv).toBeDefined();
    });

    test('T156: RBAC: manager cannot trigger export', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/export',
        headers: authHeader(managerToken),
        payload: { month: 3, year: 2026 },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  // ─── Audit Trail Tests (T157) ───────────────────────────────

  describe('Audit trail (T157)', () => {
    test('T157: Audit: rule creation writes audit log', async () => {
      mockPrisma.commissionRule.findFirst.mockResolvedValue(null);
      mockPrisma.commissionRule.create.mockResolvedValue(MOCK_RULE);

      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/rules',
        headers: authHeader(adminToken),
        payload: VALID_RULE_PAYLOAD,
      });

      expect(response.statusCode).toBe(201);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'CommissionRule',
            action: 'create',
            tenantId: TENANT_ID,
          }),
        }),
      );
    });

    test('T157: Audit: statement approval writes audit log', async () => {
      mockPrisma.commissionStatement.findFirst.mockResolvedValue({
        ...MOCK_STATEMENT,
        status: 'pending',
        disputes: [],
      });
      mockPrisma.commissionStatement.update.mockResolvedValue({
        ...MOCK_STATEMENT,
        status: 'approved',
        approvedBy: '00000000-0000-4000-a000-000000000010',
        approvedAt: new Date(),
        approver: { id: '00000000-0000-4000-a000-000000000010', firstName: 'Manager', lastName: 'User' },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/statements/stmt-1/approve',
        headers: authHeader(managerToken),
      });

      expect(response.statusCode).toBe(200);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'CommissionStatement',
            action: 'update',
            entityId: 'stmt-1',
          }),
        }),
      );
    });

    test('T157: Audit: dispute filing writes audit log', async () => {
      mockPrisma.commissionEntry.findFirst.mockResolvedValue(MOCK_ENTRY);
      mockPrisma.commissionDispute.findFirst.mockResolvedValue(null);
      mockPrisma.commissionDispute.create.mockResolvedValue(MOCK_DISPUTE);

      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/entries/entry-1/dispute',
        headers: authHeader(repToken),
        payload: { reason: 'Incorrect rate applied' },
      });

      expect(response.statusCode).toBe(201);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'CommissionDispute',
            action: 'create',
          }),
        }),
      );
    });

    test('T157: Audit: dispute resolution writes audit log', async () => {
      mockPrisma.commissionDispute.findFirst.mockResolvedValue({
        ...MOCK_DISPUTE,
        status: 'open',
      });
      mockPrisma.commissionDispute.update.mockResolvedValue({
        ...MOCK_DISPUTE,
        status: 'resolved',
        resolvedBy: '00000000-0000-4000-a000-000000000010',
        resolvedAt: new Date(),
        resolutionNotes: 'Reviewed and adjusted',
        resolver: { id: '00000000-0000-4000-a000-000000000010', firstName: 'Manager', lastName: 'User' },
      });
      mockPrisma.commissionEntry.update.mockResolvedValue(MOCK_ENTRY);
      mockPrisma.commissionEntry.findMany.mockResolvedValue([MOCK_ENTRY]);
      mockPrisma.commissionStatement.update.mockResolvedValue(MOCK_STATEMENT);

      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/disputes/dispute-1/resolve',
        headers: authHeader(managerToken),
        payload: {
          resolution: 'accepted',
          adjustedAmount: 1200.00,
          resolutionNotes: 'Reviewed and adjusted',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'CommissionDispute',
            action: 'update',
            entityId: 'dispute-1',
          }),
        }),
      );
    });

    test('T157: Audit: export creation writes audit log', async () => {
      mockPrisma.commissionExport.findFirst.mockResolvedValue(null);
      mockPrisma.commissionStatement.findMany.mockResolvedValue([{
        ...MOCK_STATEMENT,
        status: 'approved',
        rep: MOCK_STATEMENT.rep,
        entries: [],
      }]);
      mockPrisma.commissionExport.count.mockResolvedValue(0);
      mockPrisma.commissionExport.create.mockResolvedValue(MOCK_EXPORT);
      mockPrisma.commissionStatement.updateMany.mockResolvedValue({ count: 1 });

      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/export',
        headers: authHeader(adminToken),
        payload: { month: 3, year: 2026 },
      });

      expect(response.statusCode).toBe(201);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'CommissionExport',
            action: 'create',
          }),
        }),
      );
    });
  });

  // ─── Edge Cases (T158) ──────────────────────────────────────

  describe('Edge cases (T158)', () => {
    test('T158: Edge: returns 404 for non-existent rule', async () => {
      mockPrisma.commissionRule.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/commissions/rules/nonexistent-id',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('COMMISSION_RULE_NOT_FOUND');
    });

    test('T158: Edge: returns 404 for non-existent statement', async () => {
      mockPrisma.commissionStatement.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/commissions/statements/nonexistent-id',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('COMMISSION_STATEMENT_NOT_FOUND');
    });

    test('T158: Edge: returns 409 for duplicate dispute', async () => {
      mockPrisma.commissionEntry.findFirst.mockResolvedValue(MOCK_ENTRY);
      mockPrisma.commissionDispute.findFirst.mockResolvedValue(MOCK_DISPUTE);

      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/entries/entry-1/dispute',
        headers: authHeader(repToken),
        payload: { reason: 'Second dispute attempt' },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('COMMISSION_DISPUTE_ALREADY_EXISTS');
    });

    test('T158: Edge: returns 409 when approving non-pending statement', async () => {
      mockPrisma.commissionStatement.findFirst.mockResolvedValue({
        ...MOCK_STATEMENT,
        status: 'approved',
        disputes: [],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/statements/stmt-1/approve',
        headers: authHeader(managerToken),
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('COMMISSION_STATEMENT_NOT_PENDING');
    });

    test('T158: Edge: returns 409 when approving statement with open disputes', async () => {
      mockPrisma.commissionStatement.findFirst.mockResolvedValue({
        ...MOCK_STATEMENT,
        status: 'pending',
        disputes: [{ ...MOCK_DISPUTE, status: 'open' }],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/statements/stmt-1/approve',
        headers: authHeader(managerToken),
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('COMMISSION_STATEMENT_HAS_DISPUTES');
    });

    test('T158: Edge: validates request body on rule creation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/rules',
        headers: authHeader(adminToken),
        payload: { brandId: 'not-a-uuid' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ─── Tenant Isolation Tests (T159) ──────────────────────────

  describe('Tenant isolation (T159)', () => {
    test('T159: Tenant: rules scoped to tenant', async () => {
      mockPrisma.commissionRule.findMany.mockResolvedValue([MOCK_RULE]);
      mockPrisma.commissionRule.count.mockResolvedValue(1);

      const response = await app.inject({
        method: 'GET',
        url: '/api/commissions/rules',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      expect(mockPrisma.commissionRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
          }),
        }),
      );
    });

    test('T159: Tenant: statements scoped to tenant', async () => {
      mockPrisma.commissionStatement.findMany.mockResolvedValue([MOCK_STATEMENT]);
      mockPrisma.commissionStatement.count.mockResolvedValue(1);

      const response = await app.inject({
        method: 'GET',
        url: '/api/commissions/statements',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      expect(mockPrisma.commissionStatement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
          }),
        }),
      );
    });

    test('T159: Tenant: disputes scoped to tenant', async () => {
      mockPrisma.commissionEntry.findFirst.mockResolvedValue(MOCK_ENTRY);
      mockPrisma.commissionDispute.findFirst.mockResolvedValue(null);
      mockPrisma.commissionDispute.create.mockResolvedValue(MOCK_DISPUTE);

      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/entries/entry-1/dispute',
        headers: authHeader(repToken),
        payload: { reason: 'Rate dispute' },
      });

      expect(response.statusCode).toBe(201);
      expect(mockPrisma.commissionEntry.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
          }),
        }),
      );
    });

    test('T159: Tenant: exports scoped to tenant', async () => {
      mockPrisma.commissionExport.findFirst.mockResolvedValue(null);
      mockPrisma.commissionStatement.findMany.mockResolvedValue([{
        ...MOCK_STATEMENT,
        status: 'approved',
        rep: MOCK_STATEMENT.rep,
        entries: [],
      }]);
      mockPrisma.commissionExport.count.mockResolvedValue(0);
      mockPrisma.commissionExport.create.mockResolvedValue(MOCK_EXPORT);
      mockPrisma.commissionStatement.updateMany.mockResolvedValue({ count: 1 });

      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/export',
        headers: authHeader(adminToken),
        payload: { month: 3, year: 2026 },
      });

      expect(response.statusCode).toBe(201);
      expect(mockPrisma.commissionExport.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
          }),
        }),
      );
    });
  });

  // ─── Additional Route Coverage ──────────────────────────────

  describe('Commission rule routes', () => {
    test('FR-012a: GET /api/commissions/rules/:id returns rule detail', async () => {
      mockPrisma.commissionRule.findFirst.mockResolvedValue(MOCK_RULE);

      const response = await app.inject({
        method: 'GET',
        url: '/api/commissions/rules/rule-1',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.id).toBe('rule-1');
      expect(body.data.brandName).toBe('Mountain Meadow');
      expect(body.data.baseRate).toBe(0.10);
    });

    test('FR-012a: GET /api/commissions/rules returns paginated list', async () => {
      mockPrisma.commissionRule.findMany.mockResolvedValue([MOCK_RULE]);
      mockPrisma.commissionRule.count.mockResolvedValue(1);

      const response = await app.inject({
        method: 'GET',
        url: '/api/commissions/rules',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.pagination.total).toBe(1);
    });

    test('FR-012a: PUT /api/commissions/rules/:id creates new version', async () => {
      mockPrisma.commissionRule.findFirst.mockResolvedValue(MOCK_RULE);
      const updatedRule = {
        ...MOCK_RULE,
        id: 'rule-2',
        version: 2,
        baseRate: new Decimal('0.12'),
        effectiveDate: new Date('2026-04-01'),
      };
      mockPrisma.commissionRule.create.mockResolvedValue(updatedRule);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/commissions/rules/rule-1',
        headers: authHeader(adminToken),
        payload: VALID_UPDATE_RULE_PAYLOAD,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.version).toBe(2);
    });

    test('FR-012a: rule creation returns 409 when overlapping rule exists', async () => {
      mockPrisma.commissionRule.findFirst.mockResolvedValue(MOCK_RULE);

      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/rules',
        headers: authHeader(adminToken),
        payload: VALID_RULE_PAYLOAD,
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('COMMISSION_RULE_CONFLICT');
    });
  });

  describe('Commission statement routes', () => {
    test('FR-012b: GET /api/commissions/statements returns paginated list', async () => {
      mockPrisma.commissionStatement.findMany.mockResolvedValue([MOCK_STATEMENT]);
      mockPrisma.commissionStatement.count.mockResolvedValue(1);

      const response = await app.inject({
        method: 'GET',
        url: '/api/commissions/statements',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].repName).toBe('Jane Smith');
      expect(body.pagination).toBeDefined();
    });

    test('FR-012b: GET /api/commissions/statements/:id returns statement detail', async () => {
      mockPrisma.commissionStatement.findFirst.mockResolvedValue(MOCK_STATEMENT);

      const response = await app.inject({
        method: 'GET',
        url: '/api/commissions/statements/stmt-1',
        headers: authHeader(repToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.id).toBe('stmt-1');
      expect(body.data.totalEarned).toBe(1500.00);
      expect(body.data.ytdTotal).toBe(4500.00);
    });

    test('FR-012b: POST /api/commissions/statements/generate creates statements for active reps', async () => {
      const mockRep = { id: 'rep-1', firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com' };
      mockPrisma.user.findMany.mockResolvedValue([mockRep]);
      mockPrisma.commissionStatement.findFirst
        .mockResolvedValueOnce(null)  // no existing statement for this rep/month
        .mockResolvedValueOnce(MOCK_STATEMENT);  // re-fetch after create
      mockPrisma.commissionEntry.findMany.mockResolvedValue([]);
      mockPrisma.commissionEntry.aggregate.mockResolvedValue({ _sum: { commissionAmount: new Decimal('0') } });
      mockPrisma.commissionStatement.create.mockResolvedValue(MOCK_STATEMENT);

      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/statements/generate',
        headers: authHeader(adminToken),
        payload: { month: 3, year: 2026 },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.count).toBeDefined();
    });

    test('FR-012b: POST /api/commissions/statements/:id/reject rejects statement', async () => {
      mockPrisma.commissionStatement.findFirst.mockResolvedValue(MOCK_STATEMENT);

      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/statements/stmt-1/reject',
        headers: authHeader(managerToken),
        payload: { reason: 'Entries need review' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
    });
  });

  describe('Commission dispute routes', () => {
    test('FR-013a: POST /api/commissions/entries/:id/dispute files new dispute', async () => {
      mockPrisma.commissionEntry.findFirst.mockResolvedValue(MOCK_ENTRY);
      mockPrisma.commissionDispute.findFirst.mockResolvedValue(null);
      mockPrisma.commissionDispute.create.mockResolvedValue(MOCK_DISPUTE);

      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/entries/entry-1/dispute',
        headers: authHeader(repToken),
        payload: { reason: 'Incorrect rate applied' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.reason).toBe('Incorrect rate applied');
      expect(body.data.status).toBe('open');
      expect(body.data.originalAmount).toBe(1320.00);
    });

    test('FR-013a: POST /api/commissions/disputes/:id/resolve resolves dispute', async () => {
      mockPrisma.commissionDispute.findFirst.mockResolvedValue({
        ...MOCK_DISPUTE,
        status: 'open',
      });
      mockPrisma.commissionDispute.update.mockResolvedValue({
        ...MOCK_DISPUTE,
        status: 'resolved',
        adjustedAmount: new Decimal('1200.00'),
        resolvedBy: '00000000-0000-4000-a000-000000000010',
        resolvedAt: new Date(),
        resolutionNotes: 'Adjusted commission rate',
        resolver: { id: '00000000-0000-4000-a000-000000000010', firstName: 'Manager', lastName: 'User' },
      });
      mockPrisma.commissionEntry.update.mockResolvedValue(MOCK_ENTRY);
      mockPrisma.commissionEntry.findMany.mockResolvedValue([MOCK_ENTRY]);
      mockPrisma.commissionStatement.update.mockResolvedValue(MOCK_STATEMENT);

      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/disputes/dispute-1/resolve',
        headers: authHeader(managerToken),
        payload: {
          resolution: 'accepted',
          adjustedAmount: 1200.00,
          resolutionNotes: 'Adjusted commission rate',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.status).toBe('resolved');
    });

    test('FR-013a: returns 404 when filing dispute on non-existent entry', async () => {
      mockPrisma.commissionEntry.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/entries/nonexistent/dispute',
        headers: authHeader(repToken),
        payload: { reason: 'Entry not found' },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('COMMISSION_ENTRY_NOT_FOUND');
    });
  });

  describe('Commission export routes', () => {
    test('FR-013b: POST /api/commissions/export exports approved statements', async () => {
      mockPrisma.commissionExport.findFirst.mockResolvedValue(null);
      mockPrisma.commissionStatement.findMany.mockResolvedValue([{
        ...MOCK_STATEMENT,
        status: 'approved',
        rep: MOCK_STATEMENT.rep,
        entries: [],
      }]);
      mockPrisma.commissionExport.count.mockResolvedValue(0);
      mockPrisma.commissionExport.create.mockResolvedValue(MOCK_EXPORT);
      mockPrisma.commissionStatement.updateMany.mockResolvedValue({ count: 1 });

      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/export',
        headers: authHeader(adminToken),
        payload: { month: 3, year: 2026 },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.csv).toBeDefined();
      expect(body.statementsIncluded).toBe(1);
      expect(body.totalAmount).toBe(1500.00);
    });

    test('FR-013b: returns 409 when export already exists for period', async () => {
      mockPrisma.commissionExport.findFirst.mockResolvedValue(MOCK_EXPORT);

      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/export',
        headers: authHeader(adminToken),
        payload: { month: 3, year: 2026 },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.code).toBe('COMMISSION_EXPORT_ALREADY_EXISTS');
    });

    test('FR-013b: validates export request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/export',
        headers: authHeader(adminToken),
        payload: { month: 13 },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Authentication enforcement', () => {
    test('FR-012a: unauthenticated request to rules is rejected', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/commissions/rules',
      });

      expect(response.statusCode).toBe(401);
    });

    test('FR-012b: unauthenticated request to statements is rejected', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/commissions/statements',
      });

      expect(response.statusCode).toBe(401);
    });

    test('FR-013a: unauthenticated request to file dispute is rejected', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/entries/entry-1/dispute',
        payload: { reason: 'Test' },
      });

      expect(response.statusCode).toBe(401);
    });

    test('FR-013b: unauthenticated request to export is rejected', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/commissions/export',
        payload: { month: 3, year: 2026 },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
