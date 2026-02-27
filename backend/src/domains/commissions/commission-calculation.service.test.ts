import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  calculateLineItemCommission,
  getVolumeTier,
  calculateOrderCommissions,
} from './commission-calculation.service';
import type { AuditContext } from './commission-rule.service';
import type { PrismaClient, CommissionRule } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const { mockWriteAuditLog } = vi.hoisted(() => ({
  mockWriteAuditLog: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../shared/services/audit.service', () => ({
  writeAuditLog: mockWriteAuditLog,
}));

const { mockGetEffectiveRule } = vi.hoisted(() => ({
  mockGetEffectiveRule: vi.fn(),
}));
vi.mock('./commission-rule.service', () => ({
  getEffectiveRule: mockGetEffectiveRule,
  CommissionRuleError: class extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const ORDER_ID = '00000000-0000-4000-a000-000000000070';
const LINE_ITEM_ID = '00000000-0000-4000-a000-000000000071';
const REP_ID = '00000000-0000-4000-a000-000000000020';
const BRAND_ID = '00000000-0000-4000-a000-000000000030';
const RULE_ID = '00000000-0000-4000-a000-000000000060';
const TERRITORY_ID = '00000000-0000-4000-a000-000000000040';

const VOLUME_TIERS = [
  { minAmount: 0, maxAmount: 10000, bonusRate: 0 },
  { minAmount: 10000, maxAmount: 25000, bonusRate: 0.01 },
  { minAmount: 25000, maxAmount: null, bonusRate: 0.02 },
];

const AUDIT_CTX: AuditContext = {
  actorId: 'system',
  actorEmail: 'system@haversack.com',
  requestId: 'job-123',
};

describe('FR-020: Commission calculation engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getVolumeTier', () => {
    test('FR-020: returns tier 1 for amounts below $10K', () => {
      const result = getVolumeTier(5000, VOLUME_TIERS);
      expect(result).toEqual({ minAmount: 0, maxAmount: 10000, bonusRate: 0 });
    });

    test('FR-020: returns tier 2 for $10K-$25K', () => {
      const result = getVolumeTier(12000, VOLUME_TIERS);
      expect(result).toEqual({ minAmount: 10000, maxAmount: 25000, bonusRate: 0.01 });
    });

    test('FR-020: returns tier 3 for $25K+', () => {
      const result = getVolumeTier(30000, VOLUME_TIERS);
      expect(result).toEqual({ minAmount: 25000, maxAmount: null, bonusRate: 0.02 });
    });

    test('FR-020: tier boundary — $10K exactly goes to tier 2 (half-open intervals)', () => {
      const result = getVolumeTier(10000, VOLUME_TIERS);
      expect(result).toEqual({ minAmount: 10000, maxAmount: 25000, bonusRate: 0.01 });
    });

    test('FR-020: tier boundary — $9999.99 stays in tier 1', () => {
      const result = getVolumeTier(9999.99, VOLUME_TIERS);
      expect(result).toEqual({ minAmount: 0, maxAmount: 10000, bonusRate: 0 });
    });
  });

  describe('calculateLineItemCommission', () => {
    test('AC-020a: $12K line item with 10% base + 1% tier 2 + 1.0x modifier = $1,320', () => {
      const result = calculateLineItemCommission(
        12000,
        { baseRate: 0.10, territoryModifier: 1.0, volumeTiers: VOLUME_TIERS },
      );

      expect(result.commissionAmount).toBeCloseTo(1320, 2);
      expect(result.effectiveRate).toBeCloseTo(0.11, 4);
      expect(result.volumeTierApplied).toContain('tier 2');
    });

    test('FR-020: applies territory modifier correctly', () => {
      const result = calculateLineItemCommission(
        12000,
        { baseRate: 0.10, territoryModifier: 1.2, volumeTiers: VOLUME_TIERS },
      );

      // 12000 * (0.10 + 0.01) * 1.2 = 12000 * 0.11 * 1.2 = 1584
      expect(result.commissionAmount).toBeCloseTo(1584, 2);
    });

    test('FR-020: zero-commission with 0% base rate still produces entry', () => {
      const zeroTiers = [{ minAmount: 0, maxAmount: null, bonusRate: 0 }];
      const result = calculateLineItemCommission(
        5000,
        { baseRate: 0, territoryModifier: 1.0, volumeTiers: zeroTiers },
      );

      expect(result.commissionAmount).toBe(0);
      expect(result.effectiveRate).toBe(0);
    });

    test('FR-020: deterministic — same inputs produce same output', () => {
      const params = {
        baseRate: 0.10,
        territoryModifier: 1.0,
        volumeTiers: VOLUME_TIERS,
      };

      const result1 = calculateLineItemCommission(12000, params);
      const result2 = calculateLineItemCommission(12000, params);

      expect(result1.commissionAmount).toBe(result2.commissionAmount);
      expect(result1.effectiveRate).toBe(result2.effectiveRate);
    });
  });

  describe('calculateOrderCommissions', () => {
    function createMockOrder(lineItems: Array<{
      id: string;
      revenueModel: string;
      lineTotal: number;
      product: { brandId: string };
    }>): Record<string, unknown> {
      return {
        id: ORDER_ID,
        tenantId: TENANT_ID,
        repId: REP_ID,
        confirmedAt: new Date('2026-03-15'),
        account: {
          territoryId: TERRITORY_ID,
        },
        lineItems: lineItems.map((li) => ({
          id: li.id,
          tenantId: TENANT_ID,
          orderId: ORDER_ID,
          revenueModel: li.revenueModel,
          lineTotal: new Decimal(li.lineTotal.toString()),
          product: { brandId: li.product.brandId },
        })),
      };
    }

    function createMockPrisma(): {
      prisma: PrismaClient;
      commissionEntry: { create: ReturnType<typeof vi.fn> };
    } {
      const commissionEntry = {
        create: vi.fn().mockImplementation((args: Record<string, unknown>) => ({
          id: 'new-entry-id',
          ...(args as { data: Record<string, unknown> }).data,
        })),
      };

      const prisma = {
        commissionEntry,
        $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn({ commissionEntry })),
      } as unknown as PrismaClient;

      return { prisma, commissionEntry };
    }

    test('AC-020a: calculates commission for broker line items', async () => {
      const mockRule = {
        id: RULE_ID,
        baseRate: new Decimal('0.1000'),
        territoryModifier: new Decimal('1.00'),
        volumeTiers: VOLUME_TIERS,
      } as CommissionRule;
      mockGetEffectiveRule.mockResolvedValue(mockRule);

      const order = createMockOrder([
        { id: LINE_ITEM_ID, revenueModel: 'broker', lineTotal: 12000, product: { brandId: BRAND_ID } },
      ]);

      const { prisma, commissionEntry } = createMockPrisma();
      const result = await calculateOrderCommissions(prisma, TENANT_ID, order as never, AUDIT_CTX);

      expect(result).toHaveLength(1);
      expect(commissionEntry.create).toHaveBeenCalledOnce();
      expect(mockWriteAuditLog).toHaveBeenCalled();
    });

    test('US2-AC3: skips wholesale line items', async () => {
      const mockRule = {
        id: RULE_ID,
        baseRate: new Decimal('0.1000'),
        territoryModifier: new Decimal('1.00'),
        volumeTiers: VOLUME_TIERS,
      } as CommissionRule;
      mockGetEffectiveRule.mockResolvedValue(mockRule);

      const order = createMockOrder([
        { id: LINE_ITEM_ID, revenueModel: 'broker', lineTotal: 12000, product: { brandId: BRAND_ID } },
        { id: 'li-2', revenueModel: 'wholesale', lineTotal: 5000, product: { brandId: BRAND_ID } },
      ]);

      const { prisma, commissionEntry } = createMockPrisma();
      const result = await calculateOrderCommissions(prisma, TENANT_ID, order as never, AUDIT_CTX);

      expect(result).toHaveLength(1);
      expect(commissionEntry.create).toHaveBeenCalledOnce();
    });

    test('FR-020: skips brand with no commission rule and logs warning', async () => {
      mockGetEffectiveRule.mockResolvedValue(null);

      const order = createMockOrder([
        { id: LINE_ITEM_ID, revenueModel: 'broker', lineTotal: 12000, product: { brandId: BRAND_ID } },
      ]);

      const { prisma, commissionEntry } = createMockPrisma();
      const result = await calculateOrderCommissions(prisma, TENANT_ID, order as never, AUDIT_CTX);

      expect(result).toHaveLength(0);
      expect(commissionEntry.create).not.toHaveBeenCalled();
    });

    test('US2-AC4: logs calculation details in audit trail', async () => {
      const mockRule = {
        id: RULE_ID,
        baseRate: new Decimal('0.1000'),
        territoryModifier: new Decimal('1.00'),
        volumeTiers: VOLUME_TIERS,
      } as CommissionRule;
      mockGetEffectiveRule.mockResolvedValue(mockRule);

      const order = createMockOrder([
        { id: LINE_ITEM_ID, revenueModel: 'broker', lineTotal: 12000, product: { brandId: BRAND_ID } },
      ]);

      const { prisma } = createMockPrisma();
      await calculateOrderCommissions(prisma, TENANT_ID, order as never, AUDIT_CTX);

      expect(mockWriteAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'CommissionEntry',
          action: 'create',
          changeSummary: expect.objectContaining({
            ruleId: RULE_ID,
            baseRate: expect.any(Number),
            effectiveRate: expect.any(Number),
            commissionAmount: expect.any(Number),
          }),
        }),
      );
    });
  });
});
