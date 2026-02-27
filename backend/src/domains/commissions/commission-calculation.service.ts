import type { PrismaClient, CommissionEntry, Order, OrderLineItem } from '@prisma/client';
import type { VolumeTier } from '@haversack/shared';
import { Decimal } from '@prisma/client/runtime/library';
import { getEffectiveRule } from './commission-rule.service';
import type { AuditContext } from './commission-rule.service';
import { writeAuditLog } from '../../shared/services/audit.service';

export class CommissionCalculationError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'CommissionCalculationError';
    this.code = code;
  }
}

interface LineItemWithProduct extends OrderLineItem {
  product: { brandId: string };
}

interface OrderWithRelations extends Order {
  lineItems: LineItemWithProduct[];
  account: { territoryId: string };
}

interface CalculationResult {
  commissionAmount: number;
  effectiveRate: number;
  baseRate: number;
  territoryModifier: number;
  volumeTierApplied: string;
  tierBonusRate: number;
}

export function getVolumeTier(
  amount: number,
  tiers: VolumeTier[],
): VolumeTier {
  // Half-open intervals: [minAmount, maxAmount)
  // Sort tiers by minAmount descending to find the highest matching tier
  const sorted = [...tiers].sort((a, b) => b.minAmount - a.minAmount);

  for (const tier of sorted) {
    if (amount >= tier.minAmount) {
      return tier;
    }
  }

  // Fallback to first tier (should not happen with valid tiers starting at 0)
  return tiers[0]!;
}

export function calculateLineItemCommission(
  lineItemTotal: number,
  rule: { baseRate: number; territoryModifier: number; volumeTiers: VolumeTier[] },
): CalculationResult {
  const tier = getVolumeTier(lineItemTotal, rule.volumeTiers);
  const tierBonusRate = tier.bonusRate;
  const combinedRate = rule.baseRate + tierBonusRate;
  const effectiveRate = combinedRate * rule.territoryModifier;
  const commissionAmount = Math.round(lineItemTotal * effectiveRate * 100) / 100;

  const tierIndex = rule.volumeTiers.findIndex(
    (t) => t.minAmount === tier.minAmount && t.maxAmount === tier.maxAmount,
  );

  return {
    commissionAmount,
    effectiveRate,
    baseRate: rule.baseRate,
    territoryModifier: rule.territoryModifier,
    volumeTierApplied: `tier ${tierIndex + 1}: ${tier.minAmount}-${tier.maxAmount ?? '∞'} (+${(tierBonusRate * 100).toFixed(1)}%)`,
    tierBonusRate,
  };
}

export async function calculateOrderCommissions(
  prisma: PrismaClient,
  tenantId: string,
  order: OrderWithRelations,
  audit: AuditContext,
): Promise<CommissionEntry[]> {
  const entries: CommissionEntry[] = [];
  const confirmedAt = order.confirmedAt ?? new Date();
  const territoryId = order.account.territoryId;

  const txFn = async (tx: { commissionEntry: PrismaClient['commissionEntry'] }): Promise<CommissionEntry[]> => {
    for (const lineItem of order.lineItems) {
      // Skip wholesale line items — commissions only on broker model
      if (lineItem.revenueModel !== 'broker') {
        continue;
      }

      const brandId = lineItem.product.brandId;

      // Find effective rule for this brand on the order confirmation date
      const rule = await getEffectiveRule(prisma, tenantId, brandId, territoryId, confirmedAt);

      if (!rule) {
        // No rule configured for this brand — skip with warning
        // In production, this would log via Pino structured logger
        continue;
      }

      const lineTotal = Number(lineItem.lineTotal);
      const ruleParams = {
        baseRate: Number(rule.baseRate),
        territoryModifier: Number(rule.territoryModifier),
        volumeTiers: rule.volumeTiers as VolumeTier[],
      };

      const calculation = calculateLineItemCommission(lineTotal, ruleParams);

      const entry = await tx.commissionEntry.create({
        data: {
          tenantId,
          orderId: order.id,
          orderLineItemId: lineItem.id,
          repId: order.repId,
          commissionRuleId: rule.id,
          entryType: 'calculation',
          baseRate: new Decimal(calculation.baseRate.toFixed(4)),
          territoryModifier: new Decimal(calculation.territoryModifier.toFixed(2)),
          volumeTierApplied: calculation.volumeTierApplied,
          effectiveRate: new Decimal(calculation.effectiveRate.toFixed(4)),
          lineItemTotal: new Decimal(lineTotal.toFixed(2)),
          commissionAmount: new Decimal(calculation.commissionAmount.toFixed(2)),
          calculatedAt: new Date(),
        },
      });

      await writeAuditLog({
        prisma,
        tenantId,
        actorId: audit.actorId,
        actorEmail: audit.actorEmail,
        entityType: 'CommissionEntry',
        entityId: entry.id,
        action: 'create',
        changeSummary: {
          orderId: order.id,
          lineItemId: lineItem.id,
          ruleId: rule.id,
          baseRate: calculation.baseRate,
          tierBonusRate: calculation.tierBonusRate,
          territoryModifier: calculation.territoryModifier,
          effectiveRate: calculation.effectiveRate,
          lineItemTotal: lineTotal,
          commissionAmount: calculation.commissionAmount,
          volumeTierApplied: calculation.volumeTierApplied,
        },
        ipAddress: audit.ipAddress,
        requestId: audit.requestId,
      });

      entries.push(entry);
    }

    return entries;
  };

  return prisma.$transaction(async (tx) => txFn(tx as never));
}
