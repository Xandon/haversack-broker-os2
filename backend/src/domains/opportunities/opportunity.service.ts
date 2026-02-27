import type { PrismaClient, Opportunity } from '@prisma/client';
import type {
  CreateOpportunityInput,
  UpdateOpportunityInput,
  TransitionOpportunityInput,
  OpportunityListQuery,
} from '@haversack/shared';
import { writeAuditLog } from '../../shared/services/audit.service';
import { STAGE_PROBABILITY_DEFAULTS, CLOSED_STAGES } from './stage-defaults';
import type { PipelineStage } from './stage-defaults';
import { Decimal } from '@prisma/client/runtime/library';

export class OpportunityError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'OpportunityError';
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

export interface OpportunityWithRelations extends Opportunity {
  account: { id: string; name: string };
  rep: { id: string; firstName: string; lastName: string };
  brands: Array<{ brand: { id: string; name: string } }>;
}

const INCLUDE_RELATIONS = {
  account: { select: { id: true, name: true } },
  rep: { select: { id: true, firstName: true, lastName: true } },
  brands: { select: { brand: { select: { id: true, name: true } } } },
};

export function formatOpportunityResponse(opp: OpportunityWithRelations): Record<string, unknown> {
  const estimatedValue = Number(opp.estimatedValue);
  const probability = Number(opp.probability);
  const weightedValue = Math.round(estimatedValue * probability) / 100;

  return {
    id: opp.id,
    name: opp.name,
    estimatedValue,
    probability,
    weightedValue,
    expectedCloseDate: opp.expectedCloseDate instanceof Date
      ? opp.expectedCloseDate.toISOString().split('T')[0]
      : String(opp.expectedCloseDate),
    stage: opp.stage,
    closeReason: opp.closeReason,
    closedAt: opp.closedAt ? opp.closedAt.toISOString() : null,
    accountId: opp.accountId,
    accountName: opp.account.name,
    repId: opp.repId,
    repName: `${opp.rep.firstName} ${opp.rep.lastName}`,
    brands: opp.brands.map((ob) => ob.brand),
    isActive: opp.isActive,
    createdAt: opp.createdAt.toISOString(),
    updatedAt: opp.updatedAt.toISOString(),
  };
}

export async function createOpportunity(
  prisma: PrismaClient,
  tenantId: string,
  data: CreateOpportunityInput,
  actorUserId: string,
  audit: AuditContext,
): Promise<OpportunityWithRelations> {
  // Verify account exists
  const account = await prisma.account.findFirst({
    where: { id: data.accountId, tenantId, deletedAt: null },
  });
  if (!account) {
    throw new OpportunityError('Account not found', 'ACCOUNT_NOT_FOUND');
  }

  const repId = data.repId ?? actorUserId;
  const stage = data.stage as PipelineStage;
  const probability = data.probability ?? STAGE_PROBABILITY_DEFAULTS[stage];

  // Validate close reason for closed stages
  if (CLOSED_STAGES.includes(stage) && !data.probability) {
    // Auto-set probability for closed stages
  }

  const opportunity = await prisma.opportunity.create({
    data: {
      tenantId,
      accountId: data.accountId,
      repId,
      name: data.name,
      estimatedValue: new Decimal(data.estimatedValue.toString()),
      probability: new Decimal(probability.toString()),
      expectedCloseDate: new Date(data.expectedCloseDate),
      stage: data.stage,
      closedAt: CLOSED_STAGES.includes(stage) ? new Date() : null,
      brands: data.brandIds && data.brandIds.length > 0
        ? { create: data.brandIds.map((brandId) => ({ brandId })) }
        : undefined,
    },
    include: INCLUDE_RELATIONS,
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'Opportunity',
    entityId: opportunity.id,
    action: 'create',
    changeSummary: { name: data.name, stage: data.stage, estimatedValue: data.estimatedValue },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return opportunity as OpportunityWithRelations;
}

export async function getOpportunityById(
  prisma: PrismaClient,
  tenantId: string,
  id: string,
): Promise<OpportunityWithRelations> {
  const opportunity = await prisma.opportunity.findFirst({
    where: { id, tenantId, isActive: true },
    include: INCLUDE_RELATIONS,
  });

  if (!opportunity) {
    throw new OpportunityError('Opportunity not found', 'OPPORTUNITY_NOT_FOUND');
  }

  return opportunity as OpportunityWithRelations;
}

export async function updateOpportunity(
  prisma: PrismaClient,
  tenantId: string,
  id: string,
  data: UpdateOpportunityInput,
  ifMatch: string | undefined,
  audit: AuditContext,
): Promise<OpportunityWithRelations> {
  const existing = await prisma.opportunity.findFirst({
    where: { id, tenantId, isActive: true },
  });

  if (!existing) {
    throw new OpportunityError('Opportunity not found', 'OPPORTUNITY_NOT_FOUND');
  }

  // Optimistic concurrency
  if (ifMatch && existing.updatedAt.toISOString() !== ifMatch) {
    throw new OpportunityError(
      'Opportunity has been modified by another user',
      'OPPORTUNITY_CONFLICT',
    );
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData['name'] = data.name;
  if (data.estimatedValue !== undefined) updateData['estimatedValue'] = new Decimal(data.estimatedValue.toString());
  if (data.expectedCloseDate !== undefined) updateData['expectedCloseDate'] = new Date(data.expectedCloseDate);
  if (data.repId !== undefined) updateData['repId'] = data.repId;

  const opportunity = await prisma.opportunity.update({
    where: { id },
    data: updateData,
    include: INCLUDE_RELATIONS,
  });

  // Handle brand association update
  if (data.brandIds !== undefined) {
    await prisma.opportunityBrand.deleteMany({ where: { opportunityId: id } });
    if (data.brandIds.length > 0) {
      await prisma.opportunityBrand.createMany({
        data: data.brandIds.map((brandId) => ({ opportunityId: id, brandId })),
      });
    }
    // Re-fetch with updated brands
    const updated = await prisma.opportunity.findFirst({
      where: { id },
      include: INCLUDE_RELATIONS,
    });
    if (!updated) {
      throw new OpportunityError('Opportunity not found', 'OPPORTUNITY_NOT_FOUND');
    }

    await writeAuditLog({
      prisma,
      tenantId,
      actorId: audit.actorId,
      actorEmail: audit.actorEmail,
      entityType: 'Opportunity',
      entityId: id,
      action: 'update',
      changeSummary: { ...data },
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
      requestId: audit.requestId,
    });

    return updated as OpportunityWithRelations;
  }

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'Opportunity',
    entityId: id,
    action: 'update',
    changeSummary: { ...data },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return opportunity as OpportunityWithRelations;
}

export async function listOpportunities(
  prisma: PrismaClient,
  tenantId: string,
  query: OpportunityListQuery,
  scopedRepId?: string,
): Promise<{ data: OpportunityWithRelations[]; pagination: { cursor: string | null; hasMore: boolean } }> {
  const where: Record<string, unknown> = {
    tenantId,
    isActive: true,
  };

  // Rep-scoped filtering
  if (scopedRepId) {
    where['repId'] = scopedRepId;
  } else if (query.repId) {
    where['repId'] = query.repId;
  }

  if (query.stage) where['stage'] = query.stage;
  if (query.accountId) where['accountId'] = query.accountId;

  if (query.dateFrom || query.dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (query.dateFrom) dateFilter['gte'] = new Date(query.dateFrom);
    if (query.dateTo) dateFilter['lte'] = new Date(query.dateTo);
    where['expectedCloseDate'] = dateFilter;
  }

  if (query.cursor) {
    where['id'] = { lt: query.cursor };
  }

  const sortField = query.sortBy === 'estimatedValue' ? 'estimatedValue'
    : query.sortBy === 'expectedCloseDate' ? 'expectedCloseDate'
    : query.sortBy === 'name' ? 'name'
    : 'createdAt';

  const limit = query.limit ?? 20;
  const opportunities = await prisma.opportunity.findMany({
    where,
    include: INCLUDE_RELATIONS,
    orderBy: { [sortField]: query.sortOrder ?? 'desc' },
    take: limit + 1,
  });

  const hasMore = opportunities.length > limit;
  const data = hasMore ? opportunities.slice(0, limit) : opportunities;
  const cursor = hasMore && data.length > 0 ? data[data.length - 1]!.id : null;

  return {
    data: data as OpportunityWithRelations[],
    pagination: { cursor, hasMore },
  };
}

export async function softDeleteOpportunity(
  prisma: PrismaClient,
  tenantId: string,
  id: string,
  audit: AuditContext,
): Promise<{ deleted: boolean }> {
  const existing = await prisma.opportunity.findFirst({
    where: { id, tenantId, isActive: true },
  });

  if (!existing) {
    throw new OpportunityError('Opportunity not found', 'OPPORTUNITY_NOT_FOUND');
  }

  await prisma.opportunity.update({
    where: { id },
    data: { isActive: false },
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'Opportunity',
    entityId: id,
    action: 'delete',
    changeSummary: { name: existing.name },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return { deleted: true };
}

export async function transitionOpportunity(
  prisma: PrismaClient,
  tenantId: string,
  id: string,
  data: TransitionOpportunityInput,
  audit: AuditContext,
): Promise<OpportunityWithRelations> {
  const existing = await prisma.opportunity.findFirst({
    where: { id, tenantId, isActive: true },
  });

  if (!existing) {
    throw new OpportunityError('Opportunity not found', 'OPPORTUNITY_NOT_FOUND');
  }

  const currentStage = existing.stage as PipelineStage;

  // Prevent reopening closed opportunities
  if (CLOSED_STAGES.includes(currentStage)) {
    throw new OpportunityError(
      'Closed opportunities cannot be reopened',
      'OPPORTUNITY_CLOSED',
    );
  }

  const newStage = data.stage as PipelineStage;

  // Require close reason for closing stages
  if (CLOSED_STAGES.includes(newStage) && !data.closeReason) {
    throw new OpportunityError(
      'Close reason is required when closing an opportunity',
      'OPPORTUNITY_CLOSE_REASON_REQUIRED',
    );
  }

  const probability = CLOSED_STAGES.includes(newStage)
    ? STAGE_PROBABILITY_DEFAULTS[newStage]
    : (data.probability ?? STAGE_PROBABILITY_DEFAULTS[newStage]);

  const updateData: Record<string, unknown> = {
    stage: data.stage,
    probability: new Decimal(probability.toString()),
  };

  if (CLOSED_STAGES.includes(newStage)) {
    updateData['closedAt'] = new Date();
    updateData['closeReason'] = data.closeReason;
  }

  const opportunity = await prisma.opportunity.update({
    where: { id },
    data: updateData,
    include: INCLUDE_RELATIONS,
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'Opportunity',
    entityId: id,
    action: 'update',
    changeSummary: {
      stageChange: { from: currentStage, to: newStage },
      probability,
      closeReason: data.closeReason ?? null,
    },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return opportunity as OpportunityWithRelations;
}
