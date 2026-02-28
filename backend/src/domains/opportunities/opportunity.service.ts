import type {
  CreateOpportunityInput,
  UpdateOpportunityInput,
  PaginationInput,
} from '@haversack/shared';
import { STAGE_DEFAULT_PROBABILITY } from '@haversack/shared';
import { PrismaClient, Prisma, OpportunityStage } from '@prisma/client';

export interface OpportunityFilters {
  stage?: OpportunityStage;
  assignedRepId?: string;
  accountId?: string;
  search?: string;
}

export interface OpportunityListResult {
  data: Prisma.OpportunityGetPayload<{
    include: { account: true; assignedRep: true };
  }>[];
  total: number;
  page: number;
  limit: number;
}

export interface PipelineStageSummary {
  stage: OpportunityStage;
  count: number;
  totalValue: number;
  weightedValue: number;
}

export interface PipelineResult {
  stages: Record<
    string,
    {
      opportunities: Prisma.OpportunityGetPayload<{
        include: { account: true; assignedRep: true };
      }>[];
      count: number;
      totalValue: number;
      weightedValue: number;
    }
  >;
  summary: {
    totalOpportunities: number;
    totalWeightedForecast: number;
  };
}

const OPEN_STAGES: OpportunityStage[] = ['prospecting', 'qualified', 'proposal', 'negotiation'];

const ALL_STAGES: OpportunityStage[] = [
  'prospecting',
  'qualified',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
];

export function createOpportunityService(prisma: PrismaClient) {
  return {
    async list(
      tenantId: string,
      pagination: PaginationInput,
      filters: OpportunityFilters = {},
    ): Promise<OpportunityListResult> {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;

      const where: Prisma.OpportunityWhereInput = {
        tenantId,
        deletedAt: null,
        ...(filters.stage && { stage: filters.stage }),
        ...(filters.assignedRepId && { assignedRepId: filters.assignedRepId }),
        ...(filters.accountId && { accountId: filters.accountId }),
        ...(filters.search && {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            {
              account: {
                name: { contains: filters.search, mode: 'insensitive' },
              },
            },
          ],
        }),
      };

      const [data, total] = await Promise.all([
        prisma.opportunity.findMany({
          where,
          include: { account: true, assignedRep: true },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.opportunity.count({ where }),
      ]);

      return { data, total, page, limit };
    },

    async getById(tenantId: string, id: string) {
      return prisma.opportunity.findFirst({
        where: { id, tenantId, deletedAt: null },
        include: { account: true, assignedRep: true },
      });
    },

    async create(tenantId: string, input: CreateOpportunityInput) {
      const probability =
        input.probability ?? STAGE_DEFAULT_PROBABILITY[input.stage ?? 'prospecting'] ?? 10;
      const estimatedValue = input.estimatedValue;
      const weightedValue = (estimatedValue * probability) / 100;

      return prisma.opportunity.create({
        data: {
          tenantId,
          accountId: input.accountId,
          name: input.name,
          stage: (input.stage ?? 'prospecting') as OpportunityStage,
          estimatedValue,
          probability,
          weightedValue,
          closeDate: new Date(input.closeDate),
          closeReason: input.closeReason,
          assignedRepId: input.assignedRepId,
          notes: input.notes,
          associatedBrandIds: input.associatedBrandIds ?? [],
        },
        include: { account: true, assignedRep: true },
      });
    },

    async update(tenantId: string, id: string, input: UpdateOpportunityInput) {
      const existing = await prisma.opportunity.findFirst({
        where: { id, tenantId, deletedAt: null },
      });
      if (!existing) return null;

      const stage = input.stage ?? existing.stage;
      const probability =
        input.probability ?? (input.stage ? STAGE_DEFAULT_PROBABILITY[input.stage] : undefined);
      const estimatedValue = input.estimatedValue ?? Number(existing.estimatedValue);
      const finalProbability = probability ?? Number(existing.probability);
      const weightedValue = (estimatedValue * finalProbability) / 100;

      return prisma.opportunity.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.stage !== undefined && { stage: stage as OpportunityStage }),
          ...(input.estimatedValue !== undefined && { estimatedValue: input.estimatedValue }),
          probability: finalProbability,
          weightedValue,
          ...(input.closeDate !== undefined && { closeDate: new Date(input.closeDate) }),
          ...(input.closeReason !== undefined && { closeReason: input.closeReason }),
          ...(input.notes !== undefined && { notes: input.notes }),
          ...(input.associatedBrandIds !== undefined && {
            associatedBrandIds: input.associatedBrandIds,
          }),
        },
        include: { account: true, assignedRep: true },
      });
    },

    async updateStage(tenantId: string, id: string, stage: OpportunityStage, closeReason?: string) {
      const existing = await prisma.opportunity.findFirst({
        where: { id, tenantId, deletedAt: null },
      });
      if (!existing) return null;

      if (stage === 'closed_won' && !closeReason) {
        throw new Error('Close reason is required for Closed Won stage');
      }

      const probability = STAGE_DEFAULT_PROBABILITY[stage] ?? 0;
      const weightedValue = (Number(existing.estimatedValue) * probability) / 100;

      return prisma.opportunity.update({
        where: { id },
        data: {
          stage,
          probability,
          weightedValue,
          ...(closeReason !== undefined && { closeReason }),
        },
        include: { account: true, assignedRep: true },
      });
    },

    async softDelete(tenantId: string, id: string) {
      return prisma.opportunity.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    },

    async getPipeline(
      tenantId: string,
      filters: { assignedRepId?: string } = {},
    ): Promise<PipelineResult> {
      const where: Prisma.OpportunityWhereInput = {
        tenantId,
        deletedAt: null,
        ...(filters.assignedRepId && { assignedRepId: filters.assignedRepId }),
      };

      const opportunities = await prisma.opportunity.findMany({
        where,
        include: { account: true, assignedRep: true },
        orderBy: { createdAt: 'desc' },
      });

      const stages: PipelineResult['stages'] = {};
      for (const stage of ALL_STAGES) {
        const stageOpps = opportunities.filter((o) => o.stage === stage);
        stages[stage] = {
          opportunities: stageOpps,
          count: stageOpps.length,
          totalValue: stageOpps.reduce((sum, o) => sum + Number(o.estimatedValue), 0),
          weightedValue: stageOpps.reduce((sum, o) => sum + Number(o.weightedValue), 0),
        };
      }

      const openOpps = opportunities.filter((o) => OPEN_STAGES.includes(o.stage));
      const totalWeightedForecast = openOpps.reduce((sum, o) => sum + Number(o.weightedValue), 0);

      return {
        stages,
        summary: {
          totalOpportunities: opportunities.length,
          totalWeightedForecast,
        },
      };
    },
  };
}

export type OpportunityService = ReturnType<typeof createOpportunityService>;
