import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  createOpportunity,
  getOpportunityById,
  updateOpportunity,
  listOpportunities,
  softDeleteOpportunity,
  transitionOpportunity,
  formatOpportunityResponse,
  OpportunityError,
} from './opportunity.service';
import type { AuditContext, OpportunityWithRelations } from './opportunity.service';
import type { PrismaClient, Opportunity } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const { mockWriteAuditLog } = vi.hoisted(() => ({
  mockWriteAuditLog: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../shared/services/audit.service', () => ({
  writeAuditLog: mockWriteAuditLog,
}));

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const OPP_ID = '00000000-0000-4000-a000-000000000050';
const ACCOUNT_ID = '00000000-0000-4000-a000-000000000010';
const REP_ID = '00000000-0000-4000-a000-000000000020';
const BRAND_ID = '00000000-0000-4000-a000-000000000030';

const AUDIT_CTX: AuditContext = {
  actorId: REP_ID,
  actorEmail: 'rep@test.com',
  ipAddress: '127.0.0.1',
  requestId: 'req-123',
};

function createMockOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: OPP_ID,
    tenantId: TENANT_ID,
    accountId: ACCOUNT_ID,
    repId: REP_ID,
    name: 'Q3 Honey Expansion',
    estimatedValue: new Decimal('25000.00'),
    probability: new Decimal('10.00'),
    expectedCloseDate: new Date('2026-06-30'),
    stage: 'prospect',
    closeReason: null,
    closedAt: null,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as Opportunity;
}

function createMockOppWithRelations(overrides: Partial<Opportunity> = {}): OpportunityWithRelations {
  return {
    ...createMockOpportunity(overrides),
    account: { id: ACCOUNT_ID, name: 'Fresh Market PDX' },
    rep: { id: REP_ID, firstName: 'Jane', lastName: 'Smith' },
    brands: [{ brand: { id: BRAND_ID, name: 'Mountain Meadow Farms' } }],
  } as OpportunityWithRelations;
}

function createMockPrisma(): {
  prisma: PrismaClient;
  opportunity: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  opportunityBrand: {
    deleteMany: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
  };
  account: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  auditLog: { create: ReturnType<typeof vi.fn> };
} {
  const opportunity = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  };
  const opportunityBrand = {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  };
  const account = {
    findFirst: vi.fn(),
  };
  const auditLog = { create: vi.fn() };
  return {
    prisma: { opportunity, opportunityBrand, account, auditLog } as unknown as PrismaClient,
    opportunity,
    opportunityBrand,
    account,
    auditLog,
  };
}

describe('FR-016: Opportunity service', () => {
  let prisma: PrismaClient;
  let oppMock: ReturnType<typeof createMockPrisma>['opportunity'];
  let oppBrandMock: ReturnType<typeof createMockPrisma>['opportunityBrand'];
  let accountMock: ReturnType<typeof createMockPrisma>['account'];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockPrisma();
    prisma = mock.prisma;
    oppMock = mock.opportunity;
    oppBrandMock = mock.opportunityBrand;
    accountMock = mock.account;
  });

  describe('createOpportunity', () => {
    test('FR-016a: creates opportunity with auto-populated probability', async () => {
      accountMock.findFirst.mockResolvedValue({ id: ACCOUNT_ID, tenantId: TENANT_ID });
      oppMock.create.mockResolvedValue(createMockOppWithRelations());

      const result = await createOpportunity(prisma, TENANT_ID, {
        name: 'Q3 Honey Expansion',
        estimatedValue: 25000,
        expectedCloseDate: '2026-06-30',
        stage: 'prospect',
        accountId: ACCOUNT_ID,
        brandIds: [BRAND_ID],
      }, REP_ID, AUDIT_CTX);

      expect(result.name).toBe('Q3 Honey Expansion');
      expect(oppMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            probability: new Decimal('10'),
          }),
        }),
      );
    });

    test('FR-016b: uses custom probability when provided', async () => {
      accountMock.findFirst.mockResolvedValue({ id: ACCOUNT_ID, tenantId: TENANT_ID });
      oppMock.create.mockResolvedValue(createMockOppWithRelations({ probability: new Decimal('15') }));

      await createOpportunity(prisma, TENANT_ID, {
        name: 'Custom Prob',
        estimatedValue: 10000,
        expectedCloseDate: '2026-06-30',
        stage: 'prospect',
        accountId: ACCOUNT_ID,
        probability: 15,
      }, REP_ID, AUDIT_CTX);

      expect(oppMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            probability: new Decimal('15'),
          }),
        }),
      );
    });

    test('FR-016a: throws when account not found', async () => {
      accountMock.findFirst.mockResolvedValue(null);

      await expect(
        createOpportunity(prisma, TENANT_ID, {
          name: 'Test',
          estimatedValue: 1000,
          expectedCloseDate: '2026-06-30',
          stage: 'prospect',
          accountId: ACCOUNT_ID,
        }, REP_ID, AUDIT_CTX),
      ).rejects.toThrow('Account not found');
    });

    test('FR-016a: defaults repId to actor when not provided', async () => {
      accountMock.findFirst.mockResolvedValue({ id: ACCOUNT_ID, tenantId: TENANT_ID });
      oppMock.create.mockResolvedValue(createMockOppWithRelations());

      await createOpportunity(prisma, TENANT_ID, {
        name: 'No Rep',
        estimatedValue: 1000,
        expectedCloseDate: '2026-06-30',
        stage: 'prospect',
        accountId: ACCOUNT_ID,
      }, REP_ID, AUDIT_CTX);

      expect(oppMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ repId: REP_ID }),
        }),
      );
    });
  });

  describe('getOpportunityById', () => {
    test('FR-016a: returns opportunity with relations', async () => {
      oppMock.findFirst.mockResolvedValue(createMockOppWithRelations());

      const result = await getOpportunityById(prisma, TENANT_ID, OPP_ID);
      expect(result.name).toBe('Q3 Honey Expansion');
      expect(result.account.name).toBe('Fresh Market PDX');
    });

    test('FR-016a: throws when not found', async () => {
      oppMock.findFirst.mockResolvedValue(null);

      await expect(
        getOpportunityById(prisma, TENANT_ID, OPP_ID),
      ).rejects.toThrow(OpportunityError);
    });

    test('FR-016a: filters by tenant_id', async () => {
      oppMock.findFirst.mockResolvedValue(null);
      const otherTenant = '00000000-0000-4000-a000-000000000099';

      await getOpportunityById(prisma, otherTenant, OPP_ID).catch(() => {});
      expect(oppMock.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: otherTenant }),
        }),
      );
    });
  });

  describe('updateOpportunity', () => {
    test('FR-016a: updates opportunity fields', async () => {
      oppMock.findFirst.mockResolvedValue(createMockOpportunity());
      oppMock.update.mockResolvedValue(createMockOppWithRelations({ estimatedValue: new Decimal('30000') }));

      const result = await updateOpportunity(
        prisma, TENANT_ID, OPP_ID,
        { estimatedValue: 30000 },
        undefined,
        AUDIT_CTX,
      );

      expect(result).toBeDefined();
    });

    test('FR-016a: enforces optimistic concurrency', async () => {
      oppMock.findFirst.mockResolvedValue(createMockOpportunity());

      await expect(
        updateOpportunity(
          prisma, TENANT_ID, OPP_ID,
          { name: 'Updated' },
          '2025-01-01T00:00:00.000Z',
          AUDIT_CTX,
        ),
      ).rejects.toThrow('modified by another user');
    });

    test('FR-016a: throws when not found', async () => {
      oppMock.findFirst.mockResolvedValue(null);

      await expect(
        updateOpportunity(
          prisma, TENANT_ID, OPP_ID,
          { name: 'Updated' },
          undefined,
          AUDIT_CTX,
        ),
      ).rejects.toThrow('Opportunity not found');
    });

    test('FR-016c: updates brand associations', async () => {
      oppMock.findFirst
        .mockResolvedValueOnce(createMockOpportunity()) // existing check
        .mockResolvedValueOnce(createMockOppWithRelations()); // re-fetch after brand update
      oppMock.update.mockResolvedValue(createMockOppWithRelations());
      oppBrandMock.deleteMany.mockResolvedValue({ count: 1 });
      oppBrandMock.createMany.mockResolvedValue({ count: 1 });

      const result = await updateOpportunity(
        prisma, TENANT_ID, OPP_ID,
        { brandIds: [BRAND_ID] },
        undefined,
        AUDIT_CTX,
      );

      expect(oppBrandMock.deleteMany).toHaveBeenCalledWith({ where: { opportunityId: OPP_ID } });
      expect(oppBrandMock.createMany).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('listOpportunities', () => {
    test('FR-016a: lists opportunities with pagination', async () => {
      const opps = [createMockOppWithRelations()];
      oppMock.findMany.mockResolvedValue(opps);

      const result = await listOpportunities(prisma, TENANT_ID, {
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.hasMore).toBe(false);
    });

    test('FR-017d: filters by stage', async () => {
      oppMock.findMany.mockResolvedValue([]);

      await listOpportunities(prisma, TENANT_ID, {
        stage: 'prospect',
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(oppMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ stage: 'prospect' }),
        }),
      );
    });

    test('FR-017c: scopes to rep when scopedRepId provided', async () => {
      oppMock.findMany.mockResolvedValue([]);

      await listOpportunities(prisma, TENANT_ID, {
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }, REP_ID);

      expect(oppMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ repId: REP_ID }),
        }),
      );
    });

    test('FR-017d: filters by date range', async () => {
      oppMock.findMany.mockResolvedValue([]);

      await listOpportunities(prisma, TENANT_ID, {
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(oppMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expectedCloseDate: {
              gte: new Date('2026-01-01'),
              lte: new Date('2026-12-31'),
            },
          }),
        }),
      );
    });

    test('FR-016a: indicates hasMore when results exceed limit', async () => {
      const opps = Array.from({ length: 3 }, (_, i) => (
        createMockOppWithRelations({ id: `id-${i}` })
      ));
      oppMock.findMany.mockResolvedValue(opps);

      const result = await listOpportunities(prisma, TENANT_ID, {
        limit: 2,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.hasMore).toBe(true);
    });
  });

  describe('softDeleteOpportunity', () => {
    test('FR-016a: soft-deletes opportunity', async () => {
      oppMock.findFirst.mockResolvedValue(createMockOpportunity());
      oppMock.update.mockResolvedValue(createMockOpportunity({ isActive: false }));

      const result = await softDeleteOpportunity(prisma, TENANT_ID, OPP_ID, AUDIT_CTX);
      expect(result.deleted).toBe(true);
    });

    test('FR-016a: throws when not found', async () => {
      oppMock.findFirst.mockResolvedValue(null);

      await expect(
        softDeleteOpportunity(prisma, TENANT_ID, OPP_ID, AUDIT_CTX),
      ).rejects.toThrow('Opportunity not found');
    });
  });

  describe('transitionOpportunity', () => {
    test('FR-016b: transitions stage with auto-populated probability', async () => {
      oppMock.findFirst.mockResolvedValue(createMockOpportunity({ stage: 'prospect' }));
      oppMock.update.mockResolvedValue(
        createMockOppWithRelations({ stage: 'qualified', probability: new Decimal('40') }),
      );

      const result = await transitionOpportunity(
        prisma, TENANT_ID, OPP_ID,
        { stage: 'qualified' },
        AUDIT_CTX,
      );

      expect(oppMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stage: 'qualified',
            probability: new Decimal('40'),
          }),
        }),
      );
      expect(result).toBeDefined();
    });

    test('FR-016b: preserves custom probability on transition', async () => {
      oppMock.findFirst.mockResolvedValue(createMockOpportunity({ stage: 'prospect' }));
      oppMock.update.mockResolvedValue(
        createMockOppWithRelations({ stage: 'proposal', probability: new Decimal('65') }),
      );

      await transitionOpportunity(
        prisma, TENANT_ID, OPP_ID,
        { stage: 'proposal', probability: 65 },
        AUDIT_CTX,
      );

      expect(oppMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            probability: new Decimal('65'),
          }),
        }),
      );
    });

    test('FR-016d: requires close reason for closed_won', async () => {
      oppMock.findFirst.mockResolvedValue(createMockOpportunity({ stage: 'negotiation' }));

      await expect(
        transitionOpportunity(
          prisma, TENANT_ID, OPP_ID,
          { stage: 'closed_won' },
          AUDIT_CTX,
        ),
      ).rejects.toThrow('Close reason is required');
    });

    test('FR-016d: requires close reason for closed_lost', async () => {
      oppMock.findFirst.mockResolvedValue(createMockOpportunity({ stage: 'proposal' }));

      await expect(
        transitionOpportunity(
          prisma, TENANT_ID, OPP_ID,
          { stage: 'closed_lost' },
          AUDIT_CTX,
        ),
      ).rejects.toThrow('Close reason is required');
    });

    test('FR-016b: sets probability to 100% for closed_won', async () => {
      oppMock.findFirst.mockResolvedValue(createMockOpportunity({ stage: 'negotiation' }));
      oppMock.update.mockResolvedValue(
        createMockOppWithRelations({ stage: 'closed_won', probability: new Decimal('100') }),
      );

      await transitionOpportunity(
        prisma, TENANT_ID, OPP_ID,
        { stage: 'closed_won', closeReason: 'Price competitive' },
        AUDIT_CTX,
      );

      expect(oppMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            probability: new Decimal('100'),
            closedAt: expect.any(Date),
            closeReason: 'Price competitive',
          }),
        }),
      );
    });

    test('FR-016e: prevents reopening closed_won opportunity', async () => {
      oppMock.findFirst.mockResolvedValue(createMockOpportunity({ stage: 'closed_won' }));

      await expect(
        transitionOpportunity(
          prisma, TENANT_ID, OPP_ID,
          { stage: 'prospect' },
          AUDIT_CTX,
        ),
      ).rejects.toThrow('Closed opportunities cannot be reopened');
    });

    test('FR-016e: prevents reopening closed_lost opportunity', async () => {
      oppMock.findFirst.mockResolvedValue(createMockOpportunity({ stage: 'closed_lost' }));

      await expect(
        transitionOpportunity(
          prisma, TENANT_ID, OPP_ID,
          { stage: 'qualified' },
          AUDIT_CTX,
        ),
      ).rejects.toThrow('Closed opportunities cannot be reopened');
    });

    test('FR-016b: allows skipping stages (prospect to negotiation)', async () => {
      oppMock.findFirst.mockResolvedValue(createMockOpportunity({ stage: 'prospect' }));
      oppMock.update.mockResolvedValue(
        createMockOppWithRelations({ stage: 'negotiation', probability: new Decimal('75') }),
      );

      const result = await transitionOpportunity(
        prisma, TENANT_ID, OPP_ID,
        { stage: 'negotiation' },
        AUDIT_CTX,
      );

      expect(result).toBeDefined();
    });

    test('FR-016f: logs stage change via audit trail', async () => {
      oppMock.findFirst.mockResolvedValue(createMockOpportunity({ stage: 'prospect' }));
      oppMock.update.mockResolvedValue(createMockOppWithRelations({ stage: 'qualified' }));

      await transitionOpportunity(
        prisma, TENANT_ID, OPP_ID,
        { stage: 'qualified' },
        AUDIT_CTX,
      );

      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'Opportunity',
          action: 'update',
          changeSummary: expect.objectContaining({
            stageChange: { from: 'prospect', to: 'qualified' },
          }),
        }),
      );
    });
  });

  describe('audit trail verification (T135)', () => {
    test('SC-004: logs audit on create', async () => {
      accountMock.findFirst.mockResolvedValue({ id: ACCOUNT_ID, tenantId: TENANT_ID });
      oppMock.create.mockResolvedValue(createMockOppWithRelations());

      await createOpportunity(prisma, TENANT_ID, {
        name: 'Audit Test',
        estimatedValue: 5000,
        expectedCloseDate: '2026-06-30',
        stage: 'prospect',
        accountId: ACCOUNT_ID,
      }, REP_ID, AUDIT_CTX);

      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          prisma,
          tenantId: TENANT_ID,
          actorId: REP_ID,
          actorEmail: 'rep@test.com',
          entityType: 'Opportunity',
          action: 'create',
          changeSummary: expect.objectContaining({ name: 'Audit Test' }),
        }),
      );
    });

    test('SC-004: logs audit on update', async () => {
      oppMock.findFirst.mockResolvedValue(createMockOpportunity());
      oppMock.update.mockResolvedValue(createMockOppWithRelations({ name: 'Updated Name' }));

      await updateOpportunity(
        prisma, TENANT_ID, OPP_ID,
        { name: 'Updated Name' },
        undefined,
        AUDIT_CTX,
      );

      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'Opportunity',
          entityId: OPP_ID,
          action: 'update',
          changeSummary: expect.objectContaining({ name: 'Updated Name' }),
        }),
      );
    });

    test('SC-004: logs audit on soft delete', async () => {
      oppMock.findFirst.mockResolvedValue(createMockOpportunity());
      oppMock.update.mockResolvedValue(createMockOpportunity({ isActive: false }));

      await softDeleteOpportunity(prisma, TENANT_ID, OPP_ID, AUDIT_CTX);

      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'Opportunity',
          entityId: OPP_ID,
          action: 'delete',
          changeSummary: expect.objectContaining({ name: 'Q3 Honey Expansion' }),
        }),
      );
    });

    test('SC-004: audit includes IP address and request ID', async () => {
      accountMock.findFirst.mockResolvedValue({ id: ACCOUNT_ID, tenantId: TENANT_ID });
      oppMock.create.mockResolvedValue(createMockOppWithRelations());

      await createOpportunity(prisma, TENANT_ID, {
        name: 'IP Test',
        estimatedValue: 1000,
        expectedCloseDate: '2026-06-30',
        stage: 'prospect',
        accountId: ACCOUNT_ID,
      }, REP_ID, AUDIT_CTX);

      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          requestId: 'req-123',
        }),
      );
    });
  });

  describe('optimistic concurrency & edge cases (T136)', () => {
    test('SC-003: passes concurrency check when If-Match matches', async () => {
      const updatedAt = new Date('2026-01-01');
      oppMock.findFirst.mockResolvedValue(createMockOpportunity({ updatedAt }));
      oppMock.update.mockResolvedValue(createMockOppWithRelations({ name: 'Concurrent OK' }));

      const result = await updateOpportunity(
        prisma, TENANT_ID, OPP_ID,
        { name: 'Concurrent OK' },
        updatedAt.toISOString(),
        AUDIT_CTX,
      );

      expect(result).toBeDefined();
    });

    test('SC-003: transition fails for non-existent opportunity', async () => {
      oppMock.findFirst.mockResolvedValue(null);

      await expect(
        transitionOpportunity(
          prisma, TENANT_ID, 'nonexistent',
          { stage: 'qualified' },
          AUDIT_CTX,
        ),
      ).rejects.toThrow('Opportunity not found');
    });

    test('SC-003: soft delete fails for already-deleted opportunity', async () => {
      oppMock.findFirst.mockResolvedValue(null); // isActive: true filter excludes it

      await expect(
        softDeleteOpportunity(prisma, TENANT_ID, OPP_ID, AUDIT_CTX),
      ).rejects.toThrow('Opportunity not found');
    });

    test('SC-001: list returns empty array when no opportunities match', async () => {
      oppMock.findMany.mockResolvedValue([]);

      const result = await listOpportunities(prisma, TENANT_ID, {
        stage: 'closed_won',
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.data).toHaveLength(0);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.cursor).toBeNull();
    });

    test('SC-003: update with brand replace removes old brands and adds new', async () => {
      oppMock.findFirst
        .mockResolvedValueOnce(createMockOpportunity())
        .mockResolvedValueOnce(createMockOppWithRelations());
      oppMock.update.mockResolvedValue(createMockOppWithRelations());
      oppBrandMock.deleteMany.mockResolvedValue({ count: 2 });
      oppBrandMock.createMany.mockResolvedValue({ count: 2 });

      const newBrandId1 = '00000000-0000-4000-a000-000000000031';
      const newBrandId2 = '00000000-0000-4000-a000-000000000032';

      await updateOpportunity(
        prisma, TENANT_ID, OPP_ID,
        { brandIds: [newBrandId1, newBrandId2] },
        undefined,
        AUDIT_CTX,
      );

      expect(oppBrandMock.deleteMany).toHaveBeenCalledWith({ where: { opportunityId: OPP_ID } });
      expect(oppBrandMock.createMany).toHaveBeenCalledWith({
        data: [
          { opportunityId: OPP_ID, brandId: newBrandId1 },
          { opportunityId: OPP_ID, brandId: newBrandId2 },
        ],
      });
    });

    test('SC-003: update with empty brandIds removes all brands', async () => {
      oppMock.findFirst
        .mockResolvedValueOnce(createMockOpportunity())
        .mockResolvedValueOnce(createMockOppWithRelations());
      oppMock.update.mockResolvedValue(createMockOppWithRelations());
      oppBrandMock.deleteMany.mockResolvedValue({ count: 1 });

      await updateOpportunity(
        prisma, TENANT_ID, OPP_ID,
        { brandIds: [] },
        undefined,
        AUDIT_CTX,
      );

      expect(oppBrandMock.deleteMany).toHaveBeenCalledWith({ where: { opportunityId: OPP_ID } });
      expect(oppBrandMock.createMany).not.toHaveBeenCalled();
    });

    test('SC-003: transition to closed_lost sets probability to 0%', async () => {
      oppMock.findFirst.mockResolvedValue(createMockOpportunity({ stage: 'negotiation' }));
      oppMock.update.mockResolvedValue(
        createMockOppWithRelations({ stage: 'closed_lost', probability: new Decimal('0') }),
      );

      await transitionOpportunity(
        prisma, TENANT_ID, OPP_ID,
        { stage: 'closed_lost', closeReason: 'Budget constraints' },
        AUDIT_CTX,
      );

      expect(oppMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            probability: new Decimal('0'),
            closedAt: expect.any(Date),
            closeReason: 'Budget constraints',
          }),
        }),
      );
    });
  });

  describe('tenant isolation (T137)', () => {
    const OTHER_TENANT = '00000000-0000-4000-a000-000000000099';

    test('SC-001: create scopes account lookup to tenant', async () => {
      accountMock.findFirst.mockResolvedValue(null); // wrong tenant returns null

      await expect(
        createOpportunity(prisma, OTHER_TENANT, {
          name: 'Cross Tenant',
          estimatedValue: 1000,
          expectedCloseDate: '2026-06-30',
          stage: 'prospect',
          accountId: ACCOUNT_ID,
        }, REP_ID, AUDIT_CTX),
      ).rejects.toThrow('Account not found');

      expect(accountMock.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: OTHER_TENANT }),
        }),
      );
    });

    test('SC-001: getById scopes to tenant', async () => {
      oppMock.findFirst.mockResolvedValue(null);

      await getOpportunityById(prisma, OTHER_TENANT, OPP_ID).catch(() => {});

      expect(oppMock.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: OTHER_TENANT, id: OPP_ID }),
        }),
      );
    });

    test('SC-001: update scopes to tenant', async () => {
      oppMock.findFirst.mockResolvedValue(null);

      await expect(
        updateOpportunity(prisma, OTHER_TENANT, OPP_ID, { name: 'Hack' }, undefined, AUDIT_CTX),
      ).rejects.toThrow('Opportunity not found');

      expect(oppMock.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: OTHER_TENANT }),
        }),
      );
    });

    test('SC-001: soft delete scopes to tenant', async () => {
      oppMock.findFirst.mockResolvedValue(null);

      await expect(
        softDeleteOpportunity(prisma, OTHER_TENANT, OPP_ID, AUDIT_CTX),
      ).rejects.toThrow('Opportunity not found');

      expect(oppMock.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: OTHER_TENANT }),
        }),
      );
    });

    test('SC-001: list scopes to tenant', async () => {
      oppMock.findMany.mockResolvedValue([]);

      await listOpportunities(prisma, OTHER_TENANT, {
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(oppMock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: OTHER_TENANT }),
        }),
      );
    });

    test('SC-001: transition scopes to tenant', async () => {
      oppMock.findFirst.mockResolvedValue(null);

      await expect(
        transitionOpportunity(prisma, OTHER_TENANT, OPP_ID, { stage: 'qualified' }, AUDIT_CTX),
      ).rejects.toThrow('Opportunity not found');

      expect(oppMock.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: OTHER_TENANT }),
        }),
      );
    });
  });

  describe('formatOpportunityResponse', () => {
    test('FR-016a: formats opportunity with weighted value', () => {
      const opp = createMockOppWithRelations();
      const result = formatOpportunityResponse(opp);

      expect(result['name']).toBe('Q3 Honey Expansion');
      expect(result['estimatedValue']).toBe(25000);
      expect(result['probability']).toBe(10);
      expect(result['weightedValue']).toBe(2500);
      expect(result['accountName']).toBe('Fresh Market PDX');
      expect(result['repName']).toBe('Jane Smith');
      expect(result['brands']).toHaveLength(1);
    });

    test('FR-016a: formats $0 estimated value correctly', () => {
      const opp = createMockOppWithRelations({ estimatedValue: new Decimal('0') });
      const result = formatOpportunityResponse(opp);

      expect(result['weightedValue']).toBe(0);
    });

    test('FR-016a: formats closed opportunity with closedAt', () => {
      const closedAt = new Date('2026-03-15');
      const opp = createMockOppWithRelations({
        stage: 'closed_won',
        probability: new Decimal('100'),
        closedAt,
        closeReason: 'Price competitive',
      });
      const result = formatOpportunityResponse(opp);

      expect(result['closedAt']).toBe(closedAt.toISOString());
      expect(result['closeReason']).toBe('Price competitive');
    });
  });
});
