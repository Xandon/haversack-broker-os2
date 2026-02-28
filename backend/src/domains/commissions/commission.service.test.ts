import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createCommissionService } from './commission.service.js';

function createMockPrisma() {
  return {
    commission: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
  };
}

describe('CommissionService', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let service: ReturnType<typeof createCommissionService>;
  const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
  const REP_ID = '660e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = createCommissionService(mockPrisma as any);
  });

  describe('list', () => {
    it('FR-021: returns paginated commissions', async () => {
      const mockCommissions = [{ id: '1', repId: REP_ID, amount: 1320, period: '2026-03' }];
      mockPrisma.commission.findMany.mockResolvedValue(mockCommissions);
      mockPrisma.commission.count.mockResolvedValue(1);

      const result = await service.list(TENANT_ID, { page: 1, limit: 20 });

      expect(result.data).toEqual(mockCommissions);
      expect(result.total).toBe(1);
    });

    it('FR-021: filters by rep', async () => {
      mockPrisma.commission.findMany.mockResolvedValue([]);
      mockPrisma.commission.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { page: 1, limit: 20 }, { repId: REP_ID });

      const callArgs = mockPrisma.commission.findMany.mock.calls[0][0];
      expect(callArgs.where.repId).toBe(REP_ID);
    });

    it('FR-021: filters by period', async () => {
      mockPrisma.commission.findMany.mockResolvedValue([]);
      mockPrisma.commission.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { page: 1, limit: 20 }, { period: '2026-03' });

      const callArgs = mockPrisma.commission.findMany.mock.calls[0][0];
      expect(callArgs.where.period).toBe('2026-03');
    });

    it('FR-021: filters by status', async () => {
      mockPrisma.commission.findMany.mockResolvedValue([]);
      mockPrisma.commission.count.mockResolvedValue(0);

      await service.list(TENANT_ID, { page: 1, limit: 20 }, { status: 'approved' });

      const callArgs = mockPrisma.commission.findMany.mock.calls[0][0];
      expect(callArgs.where.status).toBe('approved');
    });
  });

  describe('getById', () => {
    it('FR-021: returns commission with relations', async () => {
      const mockCommission = {
        id: '1',
        amount: 1320,
        rep: { firstName: 'John' },
        brand: { name: 'Mountain Meadow' },
      };
      mockPrisma.commission.findFirst.mockResolvedValue(mockCommission);

      const result = await service.getById(TENANT_ID, '1');
      expect(result).toEqual(mockCommission);
    });
  });

  describe('getSummary', () => {
    it('FR-021: calculates commission summary with YTD', async () => {
      const currentYear = new Date().getFullYear();
      const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
      const currentPeriod = `${currentYear}-${currentMonth}`;

      mockPrisma.commission.findMany.mockResolvedValue([
        { amount: 1000, status: 'pending', period: currentPeriod },
        { amount: 2000, status: 'approved', period: currentPeriod },
        { amount: 1500, status: 'approved', period: `${currentYear}-01` },
      ]);

      const result = await service.getSummary(TENANT_ID, REP_ID);

      expect(result.totalEarned).toBe(3000);
      expect(result.totalPending).toBe(1000);
      expect(result.totalApproved).toBe(2000);
      expect(result.ytdTotal).toBe(4500);
    });
  });

  describe('getStatement', () => {
    it('FR-021: returns period statement with line items', async () => {
      const mockCommissions = [
        {
          id: '1',
          amount: 1320,
          status: 'pending',
          rep: { firstName: 'John', lastName: 'Smith' },
          brand: { name: 'Mountain Meadow' },
          order: { id: 'ord-1' },
        },
        {
          id: '2',
          amount: 800,
          status: 'pending',
          rep: { firstName: 'John', lastName: 'Smith' },
          brand: { name: 'Pacific Preserves' },
          order: { id: 'ord-2' },
        },
      ];
      mockPrisma.commission.findMany.mockResolvedValue(mockCommissions);

      const result = await service.getStatement(TENANT_ID, REP_ID, '2026-03');

      expect(result).not.toBeNull();
      expect(result!.totalAmount).toBe(2120);
      expect(result!.repName).toBe('John Smith');
      expect(result!.lineItems).toHaveLength(2);
      expect(result!.status).toBe('pending');
    });

    it('FR-021: returns null for empty period', async () => {
      mockPrisma.commission.findMany.mockResolvedValue([]);

      const result = await service.getStatement(TENANT_ID, REP_ID, '2026-03');
      expect(result).toBeNull();
    });

    it('FR-021: detects disputed status in statement', async () => {
      mockPrisma.commission.findMany.mockResolvedValue([
        {
          id: '1',
          amount: 1320,
          status: 'disputed',
          rep: { firstName: 'John', lastName: 'Smith' },
        },
        {
          id: '2',
          amount: 800,
          status: 'pending',
          rep: { firstName: 'John', lastName: 'Smith' },
        },
      ]);

      const result = await service.getStatement(TENANT_ID, REP_ID, '2026-03');
      expect(result!.status).toBe('disputed');
    });
  });

  describe('approve', () => {
    it('AC-021b: approves commission with approver and timestamp', async () => {
      const mockCommission = { id: '1', tenantId: TENANT_ID, status: 'pending' };
      mockPrisma.commission.findFirst.mockResolvedValue(mockCommission);
      mockPrisma.commission.update.mockResolvedValue({
        ...mockCommission,
        status: 'approved',
      });

      await service.approve(TENANT_ID, '1', 'manager-id');

      expect(mockPrisma.commission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'approved',
            approvedById: 'manager-id',
            approvedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('AC-021b: rejects approval of disputed commission', async () => {
      mockPrisma.commission.findFirst.mockResolvedValue({
        id: '1',
        tenantId: TENANT_ID,
        status: 'disputed',
      });

      await expect(service.approve(TENANT_ID, '1', 'manager-id')).rejects.toThrow(
        'Cannot approve a disputed commission',
      );
    });
  });

  describe('dispute', () => {
    it('FR-021: marks commission as disputed', async () => {
      mockPrisma.commission.findFirst.mockResolvedValue({
        id: '1',
        tenantId: TENANT_ID,
        status: 'pending',
      });
      mockPrisma.commission.update.mockResolvedValue({
        id: '1',
        status: 'disputed',
      });

      await service.dispute(TENANT_ID, '1');

      expect(mockPrisma.commission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'disputed' }),
        }),
      );
    });
  });

  describe('approveStatement', () => {
    it('AC-021b: approves all pending commissions in a period', async () => {
      mockPrisma.commission.findMany.mockResolvedValue([
        { id: '1', status: 'pending' },
        { id: '2', status: 'pending_approval' },
        { id: '3', status: 'approved' },
      ]);
      mockPrisma.commission.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.approveStatement(TENANT_ID, REP_ID, '2026-03', 'manager-id');

      expect(result.approved).toBe(2);
      expect(mockPrisma.commission.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['1', '2'] } },
        }),
      );
    });

    it('AC-021b: blocks statement approval when disputed items exist', async () => {
      mockPrisma.commission.findMany.mockResolvedValue([
        { id: '1', status: 'pending' },
        { id: '2', status: 'disputed' },
      ]);

      await expect(
        service.approveStatement(TENANT_ID, REP_ID, '2026-03', 'manager-id'),
      ).rejects.toThrow('Cannot approve statement with disputed line items');
    });
  });
});
