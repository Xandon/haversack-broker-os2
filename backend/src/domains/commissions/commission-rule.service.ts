import type { PrismaClient, CommissionRule } from '@prisma/client';
import type { CreateCommissionRuleInput, UpdateCommissionRuleInput, CommissionRuleListQuery } from '@haversack/shared';
import { writeAuditLog } from '../../shared/services/audit.service';

export class CommissionRuleError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'CommissionRuleError';
    this.code = code;
  }
}

export interface AuditContext {
  actorId: string;
  actorEmail: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface CommissionRuleWithRelations extends CommissionRule {
  brand: { id: string; name: string };
  territory: { id: string; name: string } | null;
}

const INCLUDE_RELATIONS = {
  brand: { select: { id: true, name: true } },
  territory: { select: { id: true, name: true } },
};

export function formatRuleResponse(rule: CommissionRuleWithRelations): Record<string, unknown> {
  return {
    id: rule.id,
    brandId: rule.brandId,
    brandName: rule.brand.name,
    territoryId: rule.territoryId,
    territoryName: rule.territory?.name ?? null,
    baseRate: Number(rule.baseRate),
    territoryModifier: Number(rule.territoryModifier),
    volumeTiers: rule.volumeTiers,
    effectiveDate: rule.effectiveDate instanceof Date
      ? rule.effectiveDate.toISOString().split('T')[0]
      : String(rule.effectiveDate),
    expiresAt: rule.expiresAt
      ? (rule.expiresAt instanceof Date ? rule.expiresAt.toISOString().split('T')[0] : String(rule.expiresAt))
      : null,
    isActive: rule.isActive,
    version: rule.version,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

export async function createCommissionRule(
  prisma: PrismaClient,
  tenantId: string,
  input: CreateCommissionRuleInput,
  audit: AuditContext,
): Promise<CommissionRuleWithRelations> {
  const effectiveDate = new Date(input.effectiveDate);

  // Check for overlapping active rule for same brand + territory + date range
  const existing = await prisma.commissionRule.findFirst({
    where: {
      tenantId,
      brandId: input.brandId,
      territoryId: input.territoryId ?? null,
      isActive: true,
      effectiveDate: { lte: effectiveDate },
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: effectiveDate } },
      ],
    },
  });

  if (existing) {
    throw new CommissionRuleError(
      `Active commission rule already exists for this brand${input.territoryId ? '/territory' : ''} covering this date`,
      'COMMISSION_RULE_CONFLICT',
    );
  }

  const rule = await prisma.commissionRule.create({
    data: {
      tenantId,
      brandId: input.brandId,
      territoryId: input.territoryId ?? null,
      baseRate: input.baseRate,
      territoryModifier: input.territoryModifier ?? 1.0,
      volumeTiers: input.volumeTiers,
      effectiveDate,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      createdBy: audit.actorId,
    },
    include: INCLUDE_RELATIONS,
  }) as CommissionRuleWithRelations;

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'CommissionRule',
    entityId: rule.id,
    action: 'create',
    changeSummary: {
      brandId: input.brandId,
      baseRate: input.baseRate,
      territoryModifier: input.territoryModifier ?? 1.0,
      effectiveDate: input.effectiveDate,
    },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return rule;
}

export async function getCommissionRule(
  prisma: PrismaClient,
  tenantId: string,
  ruleId: string,
): Promise<CommissionRuleWithRelations> {
  const rule = await prisma.commissionRule.findFirst({
    where: { id: ruleId, tenantId },
    include: INCLUDE_RELATIONS,
  }) as CommissionRuleWithRelations | null;

  if (!rule) {
    throw new CommissionRuleError('Commission rule not found', 'COMMISSION_RULE_NOT_FOUND');
  }

  return rule;
}

export async function updateCommissionRule(
  prisma: PrismaClient,
  tenantId: string,
  ruleId: string,
  input: UpdateCommissionRuleInput,
  ifMatch: string | undefined,
  audit: AuditContext,
): Promise<CommissionRuleWithRelations> {
  const existing = await prisma.commissionRule.findFirst({
    where: { id: ruleId, tenantId, isActive: true },
    include: INCLUDE_RELATIONS,
  }) as CommissionRuleWithRelations | null;

  if (!existing) {
    throw new CommissionRuleError('Commission rule not found', 'COMMISSION_RULE_NOT_FOUND');
  }

  if (ifMatch && existing.updatedAt.toISOString() !== ifMatch) {
    throw new CommissionRuleError('Rule has been modified by another user', 'COMMISSION_RULE_CONFLICT');
  }

  const newEffectiveDate = new Date(input.effectiveDate);
  const expiryDate = new Date(newEffectiveDate);
  expiryDate.setDate(expiryDate.getDate() - 1);

  // Expire the old rule
  await prisma.commissionRule.update({
    where: { id: ruleId },
    data: { expiresAt: expiryDate },
  });

  // Create new version
  const newRule = await prisma.commissionRule.create({
    data: {
      tenantId,
      brandId: existing.brandId,
      territoryId: existing.territoryId,
      baseRate: input.baseRate ?? Number(existing.baseRate),
      territoryModifier: input.territoryModifier ?? Number(existing.territoryModifier),
      volumeTiers: input.volumeTiers ?? (existing.volumeTiers as object),
      effectiveDate: newEffectiveDate,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      version: existing.version + 1,
      createdBy: audit.actorId,
    },
    include: INCLUDE_RELATIONS,
  }) as CommissionRuleWithRelations;

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'CommissionRule',
    entityId: newRule.id,
    action: 'create',
    changeSummary: {
      previousRuleId: ruleId,
      previousVersion: existing.version,
      newVersion: newRule.version,
      baseRate: Number(newRule.baseRate),
      effectiveDate: input.effectiveDate,
    },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return newRule;
}

export async function listCommissionRules(
  prisma: PrismaClient,
  tenantId: string,
  options: Partial<CommissionRuleListQuery>,
): Promise<{
  data: CommissionRuleWithRelations[];
  pagination: { cursor: string | null; hasMore: boolean; total: number };
}> {
  const limit = options.limit ?? 20;
  const activeOnly = options.activeOnly !== false;

  const where: Record<string, unknown> = { tenantId };
  if (activeOnly) where['isActive'] = true;
  if (options.brandId) where['brandId'] = options.brandId;
  if (options.territoryId) where['territoryId'] = options.territoryId;

  const [rules, total] = await Promise.all([
    prisma.commissionRule.findMany({
      where,
      include: INCLUDE_RELATIONS,
      orderBy: { effectiveDate: 'desc' },
      take: limit + 1,
      cursor: options.cursor ? { id: options.cursor } : undefined,
      skip: options.cursor ? 1 : 0,
    }),
    prisma.commissionRule.count({ where }),
  ]);

  const hasMore = rules.length > limit;
  const data = (hasMore ? rules.slice(0, limit) : rules) as CommissionRuleWithRelations[];
  const nextCursor = hasMore && data.length > 0 ? data[data.length - 1]!.id : null;

  return { data, pagination: { cursor: nextCursor, hasMore, total } };
}

export async function getEffectiveRule(
  prisma: PrismaClient,
  tenantId: string,
  brandId: string,
  territoryId: string | null,
  referenceDate: Date,
): Promise<CommissionRule | null> {
  const baseWhere = {
    tenantId,
    brandId,
    isActive: true,
    effectiveDate: { lte: referenceDate },
    OR: [
      { expiresAt: null },
      { expiresAt: { gte: referenceDate } },
    ],
  };

  // Try territory-specific rule first
  if (territoryId) {
    const territoryRule = await prisma.commissionRule.findFirst({
      where: { ...baseWhere, territoryId },
      orderBy: { effectiveDate: 'desc' },
    });

    if (territoryRule) return territoryRule;
  }

  // Fall back to default (null territory) rule
  const defaultRule = await prisma.commissionRule.findFirst({
    where: { ...baseWhere, territoryId: null },
    orderBy: { effectiveDate: 'desc' },
  });

  return defaultRule;
}
