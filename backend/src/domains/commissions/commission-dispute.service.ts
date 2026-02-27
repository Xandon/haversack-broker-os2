import type {
  PrismaClient,
  CommissionDispute,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { writeAuditLog } from '../../shared/services/audit.service';
import type { AuditContext } from './commission-rule.service';

export class CommissionDisputeError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'CommissionDisputeError';
    this.code = code;
  }
}

export interface CommissionDisputeWithRelations extends CommissionDispute {
  commissionEntry: {
    id: string;
    orderId: string;
    commissionAmount: Decimal;
    statementId: string | null;
  };
  filer: { id: string; firstName: string; lastName: string };
  resolver: { id: string; firstName: string; lastName: string } | null;
}

export interface ResolveDisputeInput {
  resolution: 'accepted' | 'rejected';
  adjustedAmount?: number;
  resolutionNotes: string;
}

const INCLUDE_RELATIONS = {
  commissionEntry: {
    select: {
      id: true,
      orderId: true,
      commissionAmount: true,
      statementId: true,
    },
  },
  filer: { select: { id: true, firstName: true, lastName: true } },
  resolver: { select: { id: true, firstName: true, lastName: true } },
};

export function formatDisputeResponse(
  dispute: CommissionDisputeWithRelations,
): Record<string, unknown> {
  return {
    id: dispute.id,
    statementId: dispute.statementId,
    commissionEntryId: dispute.commissionEntryId,
    filedBy: dispute.filedBy,
    filerName: `${dispute.filer.firstName} ${dispute.filer.lastName}`,
    reason: dispute.reason,
    status: dispute.status,
    originalAmount: Number(dispute.originalAmount),
    adjustedAmount: dispute.adjustedAmount !== null ? Number(dispute.adjustedAmount) : null,
    resolvedBy: dispute.resolvedBy,
    resolverName: dispute.resolver
      ? `${dispute.resolver.firstName} ${dispute.resolver.lastName}`
      : null,
    resolvedAt: dispute.resolvedAt?.toISOString() ?? null,
    resolutionNotes: dispute.resolutionNotes,
    createdAt: dispute.createdAt.toISOString(),
    updatedAt: dispute.updatedAt.toISOString(),
  };
}

export async function fileDispute(
  prisma: PrismaClient,
  tenantId: string,
  entryId: string,
  reason: string,
  filedBy: string,
  audit: AuditContext,
): Promise<CommissionDisputeWithRelations> {
  // Validate entry exists and belongs to tenant
  const entry = await prisma.commissionEntry.findFirst({
    where: { id: entryId, tenantId },
  });

  if (!entry) {
    throw new CommissionDisputeError(
      'Commission entry not found',
      'COMMISSION_ENTRY_NOT_FOUND',
    );
  }

  if (!entry.statementId) {
    throw new CommissionDisputeError(
      'Commission entry is not attached to a statement',
      'COMMISSION_ENTRY_NOT_FOUND',
    );
  }

  // Check for existing dispute on this entry
  const existingDispute = await prisma.commissionDispute.findFirst({
    where: { commissionEntryId: entryId, tenantId },
  });

  if (existingDispute) {
    throw new CommissionDisputeError(
      'A dispute already exists for this commission entry',
      'COMMISSION_DISPUTE_ALREADY_EXISTS',
    );
  }

  const dispute = await prisma.commissionDispute.create({
    data: {
      tenantId,
      statementId: entry.statementId,
      commissionEntryId: entryId,
      filedBy,
      reason,
      originalAmount: entry.commissionAmount,
    },
    include: INCLUDE_RELATIONS,
  }) as CommissionDisputeWithRelations;

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'CommissionDispute',
    entityId: dispute.id,
    action: 'create',
    changeSummary: {
      entryId,
      statementId: entry.statementId,
      reason,
      originalAmount: Number(entry.commissionAmount),
    },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return dispute;
}

export async function resolveDispute(
  prisma: PrismaClient,
  tenantId: string,
  disputeId: string,
  input: ResolveDisputeInput,
  resolvedBy: string,
  audit: AuditContext,
): Promise<CommissionDisputeWithRelations> {
  const dispute = await prisma.commissionDispute.findFirst({
    where: { id: disputeId, tenantId },
    include: {
      commissionEntry: {
        select: { id: true, orderId: true, commissionAmount: true, statementId: true },
      },
    },
  });

  if (!dispute) {
    throw new CommissionDisputeError(
      'Commission dispute not found',
      'COMMISSION_DISPUTE_NOT_FOUND',
    );
  }

  if (dispute.status !== 'open') {
    throw new CommissionDisputeError(
      'Dispute has already been resolved',
      'COMMISSION_DISPUTE_NOT_FOUND',
    );
  }

  const adjustedAmount = input.resolution === 'accepted' && input.adjustedAmount !== undefined
    ? new Decimal(input.adjustedAmount.toFixed(2))
    : null;

  const resolved = await prisma.$transaction(async (tx) => {
    // Update the dispute record
    const updatedDispute = await tx.commissionDispute.update({
      where: { id: disputeId },
      data: {
        status: 'resolved',
        adjustedAmount,
        resolvedBy,
        resolvedAt: new Date(),
        resolutionNotes: input.resolutionNotes,
      },
      include: INCLUDE_RELATIONS,
    });

    // If amount was adjusted, update the commission entry and recalculate statement total
    if (adjustedAmount !== null) {
      await tx.commissionEntry.update({
        where: { id: dispute.commissionEntryId },
        data: { commissionAmount: adjustedAmount },
      });

      // Recalculate statement total if entry is linked to a statement
      if (dispute.commissionEntry.statementId) {
        const statementEntries = await tx.commissionEntry.findMany({
          where: {
            statementId: dispute.commissionEntry.statementId,
            tenantId,
          },
          select: { commissionAmount: true },
        });

        const newTotal = statementEntries.reduce(
          (sum: number, e: { commissionAmount: Decimal }) => sum + Number(e.commissionAmount),
          0,
        );

        await tx.commissionStatement.update({
          where: { id: dispute.commissionEntry.statementId },
          data: { totalEarned: new Decimal(newTotal.toFixed(2)) },
        });
      }
    }

    return updatedDispute;
  }) as CommissionDisputeWithRelations;

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'CommissionDispute',
    entityId: disputeId,
    action: 'update',
    changeSummary: {
      resolution: input.resolution,
      originalAmount: Number(dispute.originalAmount),
      adjustedAmount: adjustedAmount !== null ? Number(adjustedAmount) : null,
      resolutionNotes: input.resolutionNotes,
      resolvedBy,
    },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return resolved;
}
