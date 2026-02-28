import type { PaginationInput } from '@haversack/shared';
import { PrismaClient, Prisma, CommissionStatus } from '@prisma/client';

export interface CommissionFilters {
  repId?: string;
  period?: string;
  status?: CommissionStatus;
  brandId?: string;
}

export interface CommissionListResult {
  data: Prisma.CommissionGetPayload<{
    include: { rep: true; brand: true; order: true };
  }>[];
  total: number;
  page: number;
  limit: number;
}

export interface CommissionSummary {
  totalEarned: number;
  totalPending: number;
  totalApproved: number;
  ytdTotal: number;
  statementCount: number;
}

export interface PeriodStatement {
  period: string;
  repId: string;
  repName: string;
  lineItems: Prisma.CommissionGetPayload<{
    include: { brand: true; order: true };
  }>[];
  totalAmount: number;
  status: string;
}

export function createCommissionService(prisma: PrismaClient) {
  return {
    async list(
      tenantId: string,
      pagination: PaginationInput,
      filters: CommissionFilters = {},
    ): Promise<CommissionListResult> {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;

      const where: Prisma.CommissionWhereInput = {
        tenantId,
        ...(filters.repId && { repId: filters.repId }),
        ...(filters.period && { period: filters.period }),
        ...(filters.status && { status: filters.status }),
        ...(filters.brandId && { brandId: filters.brandId }),
      };

      const [data, total] = await Promise.all([
        prisma.commission.findMany({
          where,
          include: { rep: true, brand: true, order: true },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.commission.count({ where }),
      ]);

      return { data, total, page, limit };
    },

    async getById(tenantId: string, id: string) {
      return prisma.commission.findFirst({
        where: { id, tenantId },
        include: { rep: true, brand: true, order: true, approvedBy: true },
      });
    },

    async getSummary(tenantId: string, repId: string): Promise<CommissionSummary> {
      const currentYear = new Date().getFullYear();
      const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
      const currentPeriod = `${currentYear}-${currentMonth}`;

      const allCommissions = await prisma.commission.findMany({
        where: {
          tenantId,
          repId,
          period: { startsWith: String(currentYear) },
        },
        select: { amount: true, status: true, period: true },
      });

      const currentMonthItems = allCommissions.filter((c) => c.period === currentPeriod);
      const totalEarned = currentMonthItems.reduce((sum, c) => sum + Number(c.amount), 0);
      const totalPending = currentMonthItems
        .filter((c) => c.status === 'pending' || c.status === 'pending_approval')
        .reduce((sum, c) => sum + Number(c.amount), 0);
      const totalApproved = currentMonthItems
        .filter((c) => c.status === 'approved' || c.status === 'exported')
        .reduce((sum, c) => sum + Number(c.amount), 0);
      const ytdTotal = allCommissions.reduce((sum, c) => sum + Number(c.amount), 0);

      const periods = new Set(allCommissions.map((c) => c.period));

      return {
        totalEarned,
        totalPending,
        totalApproved,
        ytdTotal,
        statementCount: periods.size,
      };
    },

    async getStatement(
      tenantId: string,
      repId: string,
      period: string,
    ): Promise<PeriodStatement | null> {
      const commissions = await prisma.commission.findMany({
        where: { tenantId, repId, period },
        include: { brand: true, order: true, rep: true },
        orderBy: { createdAt: 'asc' },
      });

      if (commissions.length === 0) return null;

      const rep = commissions[0].rep;
      const totalAmount = commissions.reduce((sum, c) => sum + Number(c.amount), 0);

      const hasDisputed = commissions.some((c) => c.status === 'disputed');
      const allApproved = commissions.every(
        (c) => c.status === 'approved' || c.status === 'exported',
      );

      let status = 'pending';
      if (hasDisputed) status = 'disputed';
      else if (allApproved) status = 'approved';
      else if (commissions.some((c) => c.status === 'pending_approval'))
        status = 'pending_approval';

      return {
        period,
        repId,
        repName: `${rep.firstName} ${rep.lastName}`,
        lineItems: commissions,
        totalAmount,
        status,
      };
    },

    async approve(tenantId: string, id: string, approvedById: string) {
      const existing = await prisma.commission.findFirst({
        where: { id, tenantId },
      });
      if (!existing) return null;
      if (existing.status === 'disputed') {
        throw new Error('Cannot approve a disputed commission');
      }

      return prisma.commission.update({
        where: { id },
        data: {
          status: 'approved',
          approvedById,
          approvedAt: new Date(),
        },
        include: { rep: true, brand: true, order: true },
      });
    },

    async dispute(tenantId: string, id: string) {
      const existing = await prisma.commission.findFirst({
        where: { id, tenantId },
      });
      if (!existing) return null;

      return prisma.commission.update({
        where: { id },
        data: { status: 'disputed' },
        include: { rep: true, brand: true, order: true },
      });
    },

    async approveStatement(tenantId: string, repId: string, period: string, approvedById: string) {
      const commissions = await prisma.commission.findMany({
        where: { tenantId, repId, period },
      });

      const hasDisputed = commissions.some((c) => c.status === 'disputed');
      if (hasDisputed) {
        throw new Error('Cannot approve statement with disputed line items');
      }

      const pendingIds = commissions
        .filter((c) => c.status === 'pending' || c.status === 'pending_approval')
        .map((c) => c.id);

      if (pendingIds.length === 0) return { approved: 0 };

      await prisma.commission.updateMany({
        where: { id: { in: pendingIds } },
        data: {
          status: 'approved',
          approvedById,
          approvedAt: new Date(),
        },
      });

      return { approved: pendingIds.length };
    },
  };
}

export type CommissionService = ReturnType<typeof createCommissionService>;
