import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createOpportunityService } from './opportunity.service.js';

function createMockPrisma() {
  return {
    opportunity: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  };
}

describe('OpportunityService', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let service: ReturnType<typeof createOpportunityService>;
  const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = createOpportunityService(mockPrisma as any);
  });

  describe('list', () => {
    it('FR-016: returns paginated opportunities', async () => {
      const mockOpps = [{ id: '1', name: 'Big Deal', stage: 'prospecting', tenantId: TENANT_ID }];
      mockPrisma.opportunity.findMany.mockResolvedValue(mockOpps);
      mockPrisma.opportunity.count.mockResolvedValue(1);

      const result = await service.list(TENANT_ID, { page: 1, limit: 20 });

      expect(result.data).toEqual(mockOpps);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('FR-017: filters by stage', async () => {
      mockPrisma.opportunity.findMany.mockResolvedValue([]);
      mockPrisma.opportunity.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { page: 1, limit: 20 }, { stage: 'qualified' });

      const callArgs = mockPrisma.opportunity.findMany.mock.calls[0][0];
      expect(callArgs.where.stage).toBe('qualified');
    });

    it('FR-017: filters by assigned rep', async () => {
      mockPrisma.opportunity.findMany.mockResolvedValue([]);
      mockPrisma.opportunity.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { page: 1, limit: 20 }, { assignedRepId: 'rep-1' });

      const callArgs = mockPrisma.opportunity.findMany.mock.calls[0][0];
      expect(callArgs.where.assignedRepId).toBe('rep-1');
    });

    it('FR-016: excludes soft-deleted opportunities', async () => {
      mockPrisma.opportunity.findMany.mockResolvedValue([]);
      mockPrisma.opportunity.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { page: 1, limit: 20 });

      const callArgs = mockPrisma.opportunity.findMany.mock.calls[0][0];
      expect(callArgs.where.deletedAt).toBeNull();
    });

    it('FR-016: filters by search term across name and account name', async () => {
      mockPrisma.opportunity.findMany.mockResolvedValue([]);
      mockPrisma.opportunity.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { page: 1, limit: 20 }, { search: 'Pacific' });

      const callArgs = mockPrisma.opportunity.findMany.mock.calls[0][0];
      expect(callArgs.where.OR).toBeDefined();
      expect(callArgs.where.OR).toHaveLength(2);
    });
  });

  describe('getById', () => {
    it('FR-016: returns opportunity with relations', async () => {
      const mockOpp = {
        id: '1',
        name: 'Big Deal',
        account: { name: 'Pacific Bistro' },
        assignedRep: { firstName: 'John' },
      };
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockOpp);

      const result = await service.getById(TENANT_ID, '1');

      expect(result).toEqual(mockOpp);
      const callArgs = mockPrisma.opportunity.findFirst.mock.calls[0][0];
      expect(callArgs.include.account).toBeTruthy();
      expect(callArgs.include.assignedRep).toBeTruthy();
    });

    it('FR-016: returns null for non-existent opportunity', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(null);

      const result = await service.getById(TENANT_ID, 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('FR-016: creates opportunity with required fields', async () => {
      const input = {
        accountId: '660e8400-e29b-41d4-a716-446655440000',
        name: 'New Deal',
        stage: 'prospecting' as const,
        estimatedValue: 50000,
        closeDate: '2026-06-01',
        assignedRepId: '770e8400-e29b-41d4-a716-446655440000',
        associatedBrandIds: [],
      };
      const mockCreated = { id: '1', ...input, tenantId: TENANT_ID };
      mockPrisma.opportunity.create.mockResolvedValue(mockCreated);

      const result = await service.create(TENANT_ID, input);

      expect(result).toEqual(mockCreated);
      expect(mockPrisma.opportunity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'New Deal',
            tenantId: TENANT_ID,
            probability: 10,
          }),
        }),
      );
    });

    it('AC-016a: auto-populates probability to 40% for qualified stage', async () => {
      const input = {
        accountId: '660e8400-e29b-41d4-a716-446655440000',
        name: 'Qualified Deal',
        stage: 'qualified' as const,
        estimatedValue: 25000,
        closeDate: '2026-06-01',
        assignedRepId: '770e8400-e29b-41d4-a716-446655440000',
        associatedBrandIds: [],
      };
      mockPrisma.opportunity.create.mockResolvedValue({ id: '1', ...input });

      await service.create(TENANT_ID, input);

      expect(mockPrisma.opportunity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            probability: 40,
            weightedValue: 10000,
          }),
        }),
      );
    });

    it('FR-016: calculates weighted value on create', async () => {
      const input = {
        accountId: '660e8400-e29b-41d4-a716-446655440000',
        name: 'Big Deal',
        stage: 'proposal' as const,
        estimatedValue: 100000,
        closeDate: '2026-06-01',
        assignedRepId: '770e8400-e29b-41d4-a716-446655440000',
        associatedBrandIds: [],
      };
      mockPrisma.opportunity.create.mockResolvedValue({ id: '1', ...input });

      await service.create(TENANT_ID, input);

      expect(mockPrisma.opportunity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            weightedValue: 60000,
          }),
        }),
      );
    });
  });

  describe('updateStage', () => {
    const mockExisting = {
      id: '1',
      tenantId: TENANT_ID,
      estimatedValue: 50000,
      probability: 60,
      stage: 'proposal',
    };

    it('AC-017b: updates stage and recalculates probability and weighted value', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockExisting);
      mockPrisma.opportunity.update.mockResolvedValue({
        ...mockExisting,
        stage: 'negotiation',
        probability: 75,
      });

      await service.updateStage(TENANT_ID, '1', 'negotiation');

      expect(mockPrisma.opportunity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stage: 'negotiation',
            probability: 75,
            weightedValue: 37500,
          }),
        }),
      );
    });

    it('AC-016b: requires close reason for closed_won stage', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockExisting);

      await expect(service.updateStage(TENANT_ID, '1', 'closed_won')).rejects.toThrow(
        'Close reason is required for Closed Won stage',
      );
    });

    it('AC-016b: sets probability to 100% for closed_won with reason', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(mockExisting);
      mockPrisma.opportunity.update.mockResolvedValue({
        ...mockExisting,
        stage: 'closed_won',
        probability: 100,
      });

      await service.updateStage(TENANT_ID, '1', 'closed_won', 'Customer signed contract');

      expect(mockPrisma.opportunity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stage: 'closed_won',
            probability: 100,
            weightedValue: 50000,
            closeReason: 'Customer signed contract',
          }),
        }),
      );
    });

    it('FR-016: returns null for non-existent opportunity', async () => {
      mockPrisma.opportunity.findFirst.mockResolvedValue(null);

      const result = await service.updateStage(TENANT_ID, 'nonexistent', 'negotiation');
      expect(result).toBeNull();
    });
  });

  describe('getPipeline', () => {
    it('FR-017: groups opportunities by stage with weighted forecast', async () => {
      const mockOpps = [
        {
          id: '1',
          stage: 'prospecting',
          estimatedValue: 10000,
          weightedValue: 1000,
        },
        {
          id: '2',
          stage: 'qualified',
          estimatedValue: 20000,
          weightedValue: 8000,
        },
        {
          id: '3',
          stage: 'proposal',
          estimatedValue: 50000,
          weightedValue: 30000,
        },
      ];
      mockPrisma.opportunity.findMany.mockResolvedValue(mockOpps);

      const result = await service.getPipeline(TENANT_ID);

      expect(result.stages['prospecting'].count).toBe(1);
      expect(result.stages['qualified'].count).toBe(1);
      expect(result.stages['proposal'].count).toBe(1);
      expect(result.stages['negotiation'].count).toBe(0);
      expect(result.summary.totalOpportunities).toBe(3);
      expect(result.summary.totalWeightedForecast).toBe(39000);
    });

    it('FR-017: filters pipeline by assigned rep', async () => {
      mockPrisma.opportunity.findMany.mockResolvedValue([]);

      await service.getPipeline(TENANT_ID, { assignedRepId: 'rep-1' });

      const callArgs = mockPrisma.opportunity.findMany.mock.calls[0][0];
      expect(callArgs.where.assignedRepId).toBe('rep-1');
    });

    it('FR-017: only counts open stages in weighted forecast', async () => {
      const mockOpps = [
        {
          id: '1',
          stage: 'prospecting',
          estimatedValue: 10000,
          weightedValue: 1000,
        },
        {
          id: '2',
          stage: 'closed_won',
          estimatedValue: 50000,
          weightedValue: 50000,
        },
      ];
      mockPrisma.opportunity.findMany.mockResolvedValue(mockOpps);

      const result = await service.getPipeline(TENANT_ID);

      expect(result.summary.totalWeightedForecast).toBe(1000);
    });
  });

  describe('softDelete', () => {
    it('FR-016: soft deletes opportunity', async () => {
      mockPrisma.opportunity.update.mockResolvedValue({
        id: '1',
        deletedAt: new Date(),
      });

      await service.softDelete(TENANT_ID, '1');

      expect(mockPrisma.opportunity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });
  });
});
