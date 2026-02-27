import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  createCommissionRule,
  getCommissionRule,
  updateCommissionRule,
  listCommissionRules,
  getEffectiveRule,
  CommissionRuleError,
} from './commission-rule.service';
import type { AuditContext } from './commission-rule.service';
import type { PrismaClient, CommissionRule } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const { mockWriteAuditLog } = vi.hoisted(() => ({
  mockWriteAuditLog: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../shared/services/audit.service', () => ({
  writeAuditLog: mockWriteAuditLog,
}));

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const RULE_ID = '00000000-0000-4000-a000-000000000060';
const BRAND_ID = '00000000-0000-4000-a000-000000000030';
const TERRITORY_ID = '00000000-0000-4000-a000-000000000040';
const USER_ID = '00000000-0000-4000-a000-000000000020';

const AUDIT_CTX: AuditContext = {
  actorId: USER_ID,
  actorEmail: 'admin@test.com',
  ipAddress: '127.0.0.1',
  requestId: 'req-123',
};

const VOLUME_TIERS = [
  { minAmount: 0, maxAmount: 10000, bonusRate: 0 },
  { minAmount: 10000, maxAmount: 25000, bonusRate: 0.01 },
  { minAmount: 25000, maxAmount: null, bonusRate: 0.02 },
];

function createMockRule(overrides: Partial<CommissionRule> = {}): CommissionRule {
  return {
    id: RULE_ID,
    tenantId: TENANT_ID,
    brandId: BRAND_ID,
    territoryId: null,
    baseRate: new Decimal('0.1000'),
    territoryModifier: new Decimal('1.00'),
    volumeTiers: VOLUME_TIERS,
    effectiveDate: new Date('2026-01-01'),
    expiresAt: null,
    isActive: true,
    version: 1,
    createdBy: USER_ID,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  } as CommissionRule;
}

interface MockRuleWithRelations extends CommissionRule {
  brand: { id: string; name: string };
  territory: { id: string; name: string } | null;
}

function createMockRuleWithRelations(overrides: Partial<CommissionRule> = {}): MockRuleWithRelations {
  return {
    ...createMockRule(overrides),
    brand: { id: BRAND_ID, name: 'Mountain Meadow Farms' },
    territory: null,
  };
}

function createMockPrisma(): {
  prisma: PrismaClient;
  commissionRule: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
} {
  const commissionRule = {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  };

  const prisma = {
    commissionRule,
  } as unknown as PrismaClient;

  return { prisma, commissionRule };
}

describe('FR-020: Commission rule service', () => {
  let prisma: PrismaClient;
  let commissionRule: ReturnType<typeof createMockPrisma>['commissionRule'];

  beforeEach(() => {
    vi.clearAllMocks();
    const mocks = createMockPrisma();
    prisma = mocks.prisma;
    commissionRule = mocks.commissionRule;
  });

  describe('createCommissionRule', () => {
    test('US1-AC1: creates rule with base rate, modifier, and volume tiers', async () => {
      commissionRule.findFirst.mockResolvedValue(null); // no conflict
      commissionRule.create.mockResolvedValue(createMockRuleWithRelations());

      const result = await createCommissionRule(prisma, TENANT_ID, {
        brandId: BRAND_ID,
        baseRate: 0.10,
        territoryModifier: 1.0,
        volumeTiers: VOLUME_TIERS,
        effectiveDate: '2026-01-01',
      }, AUDIT_CTX);

      expect(result).toBeDefined();
      expect(result.brandId).toBe(BRAND_ID);
      expect(commissionRule.create).toHaveBeenCalledOnce();
      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'CommissionRule',
          action: 'create',
        }),
      );
    });

    test('FR-020: rejects overlapping active rule for same brand+territory+date range', async () => {
      commissionRule.findFirst.mockResolvedValue(createMockRule()); // existing rule

      await expect(
        createCommissionRule(prisma, TENANT_ID, {
          brandId: BRAND_ID,
          baseRate: 0.12,
          territoryModifier: 1.0,
          volumeTiers: VOLUME_TIERS,
          effectiveDate: '2026-01-01',
        }, AUDIT_CTX),
      ).rejects.toThrow(CommissionRuleError);
    });

    test('FR-020: allows territory-specific override alongside default rule', async () => {
      commissionRule.findFirst.mockResolvedValue(null);
      commissionRule.create.mockResolvedValue(createMockRuleWithRelations({
        territoryId: TERRITORY_ID,
      }));

      const result = await createCommissionRule(prisma, TENANT_ID, {
        brandId: BRAND_ID,
        territoryId: TERRITORY_ID,
        baseRate: 0.12,
        territoryModifier: 1.1,
        volumeTiers: VOLUME_TIERS,
        effectiveDate: '2026-01-01',
      }, AUDIT_CTX);

      expect(result).toBeDefined();
    });
  });

  describe('getCommissionRule', () => {
    test('US1-AC3: returns rule by ID with tenant isolation', async () => {
      commissionRule.findFirst.mockResolvedValue(createMockRuleWithRelations());

      const result = await getCommissionRule(prisma, TENANT_ID, RULE_ID);

      expect(result).toBeDefined();
      expect(commissionRule.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          id: RULE_ID,
          tenantId: TENANT_ID,
        }),
      }));
    });

    test('FR-020: throws NOT_FOUND for nonexistent rule', async () => {
      commissionRule.findFirst.mockResolvedValue(null);

      await expect(
        getCommissionRule(prisma, TENANT_ID, 'nonexistent'),
      ).rejects.toThrow(CommissionRuleError);
    });
  });

  describe('updateCommissionRule', () => {
    test('US1-AC2: creates new version with new effective date', async () => {
      const existing = createMockRuleWithRelations();
      commissionRule.findFirst.mockResolvedValueOnce(existing); // find existing
      commissionRule.update.mockResolvedValue({ ...existing, expiresAt: new Date('2026-03-31') }); // expire old
      commissionRule.create.mockResolvedValue(createMockRuleWithRelations({
        id: '00000000-0000-4000-a000-000000000061',
        baseRate: new Decimal('0.1200'),
        effectiveDate: new Date('2026-04-01'),
        version: 2,
      }));

      const result = await updateCommissionRule(
        prisma, TENANT_ID, RULE_ID,
        { baseRate: 0.12, effectiveDate: '2026-04-01' },
        existing.updatedAt.toISOString(),
        AUDIT_CTX,
      );

      expect(result).toBeDefined();
      expect(commissionRule.update).toHaveBeenCalled(); // expire old
      expect(commissionRule.create).toHaveBeenCalled(); // create new version
      expect(mockWriteAuditLog).toHaveBeenCalled();
    });

    test('FR-020: rejects with conflict on version mismatch', async () => {
      const existing = createMockRuleWithRelations();
      commissionRule.findFirst.mockResolvedValue(existing);

      await expect(
        updateCommissionRule(
          prisma, TENANT_ID, RULE_ID,
          { baseRate: 0.12, effectiveDate: '2026-04-01' },
          '2025-12-31T00:00:00.000Z', // stale
          AUDIT_CTX,
        ),
      ).rejects.toThrow(CommissionRuleError);
    });
  });

  describe('listCommissionRules', () => {
    test('US1-AC4: returns rules with pagination', async () => {
      commissionRule.findMany.mockResolvedValue([createMockRuleWithRelations()]);
      commissionRule.count.mockResolvedValue(1);

      const result = await listCommissionRules(prisma, TENANT_ID, {});

      expect(result.data).toHaveLength(1);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBe(1);
    });

    test('FR-020: filters by brandId', async () => {
      commissionRule.findMany.mockResolvedValue([]);
      commissionRule.count.mockResolvedValue(0);

      await listCommissionRules(prisma, TENANT_ID, { brandId: BRAND_ID });

      expect(commissionRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ brandId: BRAND_ID }),
        }),
      );
    });

    test('FR-020: filters activeOnly by default', async () => {
      commissionRule.findMany.mockResolvedValue([]);
      commissionRule.count.mockResolvedValue(0);

      await listCommissionRules(prisma, TENANT_ID, {});

      expect(commissionRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });
  });

  describe('getEffectiveRule', () => {
    test('FR-020: returns territory-specific rule when available', async () => {
      const territoryRule = createMockRule({ territoryId: TERRITORY_ID });
      commissionRule.findFirst
        .mockResolvedValueOnce(territoryRule); // territory-specific

      const result = await getEffectiveRule(prisma, TENANT_ID, BRAND_ID, TERRITORY_ID, new Date('2026-03-15'));

      expect(result).toBeDefined();
      expect(result?.territoryId).toBe(TERRITORY_ID);
    });

    test('FR-020: falls back to default rule when no territory-specific rule', async () => {
      const defaultRule = createMockRule({ territoryId: null });
      commissionRule.findFirst
        .mockResolvedValueOnce(null) // no territory-specific
        .mockResolvedValueOnce(defaultRule); // default

      const result = await getEffectiveRule(prisma, TENANT_ID, BRAND_ID, TERRITORY_ID, new Date('2026-03-15'));

      expect(result).toBeDefined();
      expect(result?.territoryId).toBeNull();
    });

    test('FR-020: returns null when no rule exists for brand', async () => {
      commissionRule.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await getEffectiveRule(prisma, TENANT_ID, BRAND_ID, TERRITORY_ID, new Date('2026-03-15'));

      expect(result).toBeNull();
    });

    test('AC-020b: uses effective date to find correct rule version', async () => {
      const rule = createMockRule({ effectiveDate: new Date('2026-01-01') });
      commissionRule.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(rule);

      await getEffectiveRule(prisma, TENANT_ID, BRAND_ID, null, new Date('2026-03-15'));

      expect(commissionRule.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            effectiveDate: { lte: new Date('2026-03-15') },
          }),
        }),
      );
    });
  });
});
