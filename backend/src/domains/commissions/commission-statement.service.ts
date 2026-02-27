import type {
  PrismaClient,
  CommissionStatement,
  CommissionEntry,
  CommissionDispute,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { writeAuditLog } from '../../shared/services/audit.service';
import type { AuditContext } from './commission-rule.service';

export class CommissionStatementError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'CommissionStatementError';
    this.code = code;
  }
}

export interface CommissionStatementWithRelations extends CommissionStatement {
  rep: { id: string; firstName: string; lastName: string; email: string };
  approver: { id: string; firstName: string; lastName: string } | null;
  entries: CommissionEntry[];
  disputes: CommissionDispute[];
}

export interface StatementListOptions {
  repId?: string;
  month?: number;
  year?: number;
  status?: string;
  cursor?: string;
  limit?: number;
}

export interface StatementListResult {
  data: CommissionStatementWithRelations[];
  pagination: { cursor: string | null; hasMore: boolean; total: number };
}

const INCLUDE_RELATIONS = {
  rep: { select: { id: true, firstName: true, lastName: true, email: true } },
  approver: { select: { id: true, firstName: true, lastName: true } },
  entries: true,
  disputes: true,
};

export function formatStatementResponse(
  statement: CommissionStatementWithRelations,
): Record<string, unknown> {
  return {
    id: statement.id,
    repId: statement.repId,
    repName: `${statement.rep.firstName} ${statement.rep.lastName}`,
    repEmail: statement.rep.email,
    month: statement.month,
    year: statement.year,
    status: statement.status,
    totalEarned: Number(statement.totalEarned),
    ytdTotal: Number(statement.ytdTotal),
    approvedBy: statement.approvedBy,
    approverName: statement.approver
      ? `${statement.approver.firstName} ${statement.approver.lastName}`
      : null,
    approvedAt: statement.approvedAt?.toISOString() ?? null,
    exportedAt: statement.exportedAt?.toISOString() ?? null,
    entryCount: statement.entries.length,
    disputeCount: statement.disputes.length,
    openDisputeCount: statement.disputes.filter((d) => d.status === 'open').length,
    version: statement.version,
    createdAt: statement.createdAt.toISOString(),
    updatedAt: statement.updatedAt.toISOString(),
  };
}

export async function generateStatements(
  prisma: PrismaClient,
  tenantId: string,
  month: number,
  year: number,
  audit: AuditContext,
): Promise<CommissionStatementWithRelations[]> {
  // Find all active reps for the tenant
  const reps = await prisma.user.findMany({
    where: {
      tenantId,
      role: 'rep',
      isActive: true,
      deletedAt: null,
    },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  // Date range for the statement month
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 1);

  const statements: CommissionStatementWithRelations[] = [];

  for (const rep of reps) {
    // Check if a statement already exists for this rep/month/year
    const existing = await prisma.commissionStatement.findFirst({
      where: { tenantId, repId: rep.id, month, year },
    });

    if (existing) {
      // Skip reps that already have a statement for this period
      continue;
    }

    // Aggregate commission entries for this rep in the period
    const entries = await prisma.commissionEntry.findMany({
      where: {
        tenantId,
        repId: rep.id,
        statementId: null,
        calculatedAt: { gte: periodStart, lt: periodEnd },
      },
    });

    const totalEarned = entries.reduce(
      (sum, entry) => sum + Number(entry.commissionAmount),
      0,
    );

    // Calculate YTD: sum of all commission entries for this rep, year-to-date
    const ytdStart = new Date(year, 0, 1);
    const ytdAggregation = await prisma.commissionEntry.aggregate({
      where: {
        tenantId,
        repId: rep.id,
        calculatedAt: { gte: ytdStart, lt: periodEnd },
      },
      _sum: { commissionAmount: true },
    });

    const ytdTotal = Number(ytdAggregation._sum.commissionAmount ?? 0);

    // Create the statement in a transaction
    const statement = await prisma.$transaction(async (tx) => {
      const created = await tx.commissionStatement.create({
        data: {
          tenantId,
          repId: rep.id,
          month,
          year,
          totalEarned: new Decimal(totalEarned.toFixed(2)),
          ytdTotal: new Decimal(ytdTotal.toFixed(2)),
        },
        include: INCLUDE_RELATIONS,
      });

      // Link entries to this statement
      if (entries.length > 0) {
        await tx.commissionEntry.updateMany({
          where: {
            id: { in: entries.map((e) => e.id) },
            tenantId,
          },
          data: { statementId: created.id },
        });
      }

      return created;
    }) as CommissionStatementWithRelations;

    // Re-fetch to get updated entries
    const fullStatement = await prisma.commissionStatement.findFirst({
      where: { id: statement.id, tenantId },
      include: INCLUDE_RELATIONS,
    }) as CommissionStatementWithRelations;

    await writeAuditLog({
      prisma,
      tenantId,
      actorId: audit.actorId,
      actorEmail: audit.actorEmail,
      entityType: 'CommissionStatement',
      entityId: fullStatement.id,
      action: 'create',
      changeSummary: {
        repId: rep.id,
        month,
        year,
        totalEarned,
        ytdTotal,
        entryCount: entries.length,
      },
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
      requestId: audit.requestId,
    });

    statements.push(fullStatement);
  }

  return statements;
}

export async function getStatement(
  prisma: PrismaClient,
  tenantId: string,
  statementId: string,
): Promise<CommissionStatementWithRelations> {
  const statement = await prisma.commissionStatement.findFirst({
    where: { id: statementId, tenantId },
    include: INCLUDE_RELATIONS,
  }) as CommissionStatementWithRelations | null;

  if (!statement) {
    throw new CommissionStatementError(
      'Commission statement not found',
      'COMMISSION_STATEMENT_NOT_FOUND',
    );
  }

  return statement;
}

export async function listStatements(
  prisma: PrismaClient,
  tenantId: string,
  options: StatementListOptions,
): Promise<StatementListResult> {
  const limit = options.limit ?? 20;

  const where: Record<string, unknown> = { tenantId };
  if (options.repId) where['repId'] = options.repId;
  if (options.month !== undefined) where['month'] = options.month;
  if (options.year !== undefined) where['year'] = options.year;
  if (options.status) where['status'] = options.status;

  const [results, total] = await Promise.all([
    prisma.commissionStatement.findMany({
      where,
      include: INCLUDE_RELATIONS,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: limit + 1,
      cursor: options.cursor ? { id: options.cursor } : undefined,
      skip: options.cursor ? 1 : 0,
    }),
    prisma.commissionStatement.count({ where }),
  ]);

  const hasMore = results.length > limit;
  const data = (hasMore ? results.slice(0, limit) : results) as CommissionStatementWithRelations[];
  const nextCursor = hasMore && data.length > 0 ? data[data.length - 1]!.id : null;

  return { data, pagination: { cursor: nextCursor, hasMore, total } };
}

export async function approveStatement(
  prisma: PrismaClient,
  tenantId: string,
  statementId: string,
  approverId: string,
  ifMatch: string | undefined,
  audit: AuditContext,
): Promise<CommissionStatementWithRelations> {
  const statement = await prisma.commissionStatement.findFirst({
    where: { id: statementId, tenantId },
    include: { disputes: true },
  });

  if (!statement) {
    throw new CommissionStatementError(
      'Commission statement not found',
      'COMMISSION_STATEMENT_NOT_FOUND',
    );
  }

  if (statement.status !== 'pending') {
    throw new CommissionStatementError(
      `Cannot approve statement with status "${statement.status}"`,
      'COMMISSION_STATEMENT_NOT_PENDING',
    );
  }

  if (ifMatch && statement.updatedAt.toISOString() !== ifMatch) {
    throw new CommissionStatementError(
      'Statement has been modified by another user',
      'COMMISSION_STATEMENT_CONFLICT',
    );
  }

  // Check for open disputes
  const openDisputes = statement.disputes.filter((d) => d.status === 'open');
  if (openDisputes.length > 0) {
    throw new CommissionStatementError(
      `Cannot approve statement with ${openDisputes.length} open dispute(s)`,
      'COMMISSION_STATEMENT_HAS_DISPUTES',
    );
  }

  const updated = await prisma.commissionStatement.update({
    where: { id: statementId },
    data: {
      status: 'approved',
      approvedBy: approverId,
      approvedAt: new Date(),
    },
    include: INCLUDE_RELATIONS,
  }) as CommissionStatementWithRelations;

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'CommissionStatement',
    entityId: statementId,
    action: 'update',
    changeSummary: {
      action: 'approve',
      approverId,
      previousStatus: 'pending',
      newStatus: 'approved',
    },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return updated;
}

export async function rejectStatement(
  prisma: PrismaClient,
  tenantId: string,
  statementId: string,
  reason: string,
  audit: AuditContext,
): Promise<CommissionStatementWithRelations> {
  const statement = await prisma.commissionStatement.findFirst({
    where: { id: statementId, tenantId },
    include: INCLUDE_RELATIONS,
  }) as CommissionStatementWithRelations | null;

  if (!statement) {
    throw new CommissionStatementError(
      'Commission statement not found',
      'COMMISSION_STATEMENT_NOT_FOUND',
    );
  }

  if (statement.status !== 'pending') {
    throw new CommissionStatementError(
      `Cannot reject statement with status "${statement.status}"`,
      'COMMISSION_STATEMENT_NOT_PENDING',
    );
  }

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'CommissionStatement',
    entityId: statementId,
    action: 'update',
    changeSummary: {
      action: 'reject',
      reason,
      previousStatus: 'pending',
    },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return statement;
}
