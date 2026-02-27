import type { PrismaClient, CommissionExport } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { writeAuditLog } from '../../shared/services/audit.service';
import type { AuditContext } from './commission-rule.service';

export class CommissionExportError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'CommissionExportError';
    this.code = code;
  }
}

export interface CommissionExportRecord extends CommissionExport {
  creator: { id: string; firstName: string; lastName: string; email: string };
  statements: Array<{
    id: string;
    repId: string;
    month: number;
    year: number;
    totalEarned: Decimal;
  }>;
}

export interface ExportResult {
  export: CommissionExportRecord;
  csv: string;
  statementsIncluded: number;
  statementsSkipped: number;
  totalAmount: number;
}

const INCLUDE_RELATIONS = {
  creator: { select: { id: true, firstName: true, lastName: true, email: true } },
  statements: {
    select: { id: true, repId: true, month: true, year: true, totalEarned: true },
  },
};

export function formatExportResponse(exportRecord: CommissionExportRecord): Record<string, unknown> {
  return {
    id: exportRecord.id,
    tenantId: exportRecord.tenantId,
    referenceId: exportRecord.referenceId,
    month: exportRecord.month,
    year: exportRecord.year,
    format: exportRecord.format,
    status: exportRecord.status,
    statementsIncluded: exportRecord.statements.length,
    createdBy: exportRecord.createdBy,
    creatorName: `${exportRecord.creator.firstName} ${exportRecord.creator.lastName}`,
    createdAt: exportRecord.createdAt.toISOString(),
  };
}

export async function exportStatements(
  prisma: PrismaClient,
  tenantId: string,
  month: number,
  year: number,
  forceReExport: boolean,
  audit: AuditContext,
): Promise<ExportResult> {
  // Check if an export already exists for this month/year/tenant
  const existingExport = await prisma.commissionExport.findFirst({
    where: { tenantId, month, year },
  });

  if (existingExport && !forceReExport) {
    throw new CommissionExportError(
      `Commission export already exists for ${year}-${String(month).padStart(2, '0')}`,
      'COMMISSION_EXPORT_ALREADY_EXISTS',
    );
  }

  // Find all approved statements for the given month/year/tenant
  const statements = await prisma.commissionStatement.findMany({
    where: {
      tenantId,
      month,
      year,
      status: 'approved',
    },
    include: {
      rep: { select: { id: true, firstName: true, lastName: true, email: true } },
      entries: true,
    },
    orderBy: [{ rep: { lastName: 'asc' } }, { rep: { firstName: 'asc' } }],
  });

  if (statements.length === 0) {
    throw new CommissionExportError(
      `No approved statements found for ${year}-${String(month).padStart(2, '0')}`,
      'COMMISSION_EXPORT_NO_STATEMENTS',
    );
  }

  // Generate CSV content
  const period = `${year}-${String(month).padStart(2, '0')}`;
  const csvHeader = 'Rep Name,Rep Email,Period,Order Count,Total Commission';
  const csvRows = statements.map((statement) => {
    const repName = `${statement.rep.firstName} ${statement.rep.lastName}`;
    const repEmail = statement.rep.email;
    const orderCount = statement.entries.length;
    const totalCommission = Number(statement.totalEarned).toFixed(2);
    return `"${repName}","${repEmail}","${period}",${orderCount},${totalCommission}`;
  });
  const csvData = [csvHeader, ...csvRows].join('\n');

  // Calculate total amount across all statements
  const totalAmount = statements.reduce(
    (sum, statement) => sum + Number(statement.totalEarned),
    0,
  );

  // Generate sequential reference ID
  const existingExportCount = await prisma.commissionExport.count({
    where: { tenantId },
  });
  const sequentialNumber = String(existingExportCount + 1).padStart(3, '0');
  const referenceId = `QB-${year}-${String(month).padStart(2, '0')}-${sequentialNumber}`;

  // Create export record and update statements in a transaction
  const exportRecord = await prisma.$transaction(async (tx) => {
    const created = await tx.commissionExport.create({
      data: {
        tenantId,
        referenceId,
        month,
        year,
        format: 'csv',
        fileContent: csvData,
        createdBy: audit.actorId,
        statements: {
          connect: statements.map((s) => ({ id: s.id })),
        },
      },
      include: INCLUDE_RELATIONS,
    });

    // Mark all processed statements as exported
    const now = new Date();
    await tx.commissionStatement.updateMany({
      where: {
        id: { in: statements.map((s) => s.id) },
        tenantId,
      },
      data: {
        status: 'exported',
        exportedAt: now,
      },
    });

    return created;
  }) as CommissionExportRecord;

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'CommissionExport',
    entityId: exportRecord.id,
    action: 'create',
    changeSummary: {
      referenceId,
      month,
      year,
      statementsIncluded: statements.length,
      statementsSkipped: 0,
      totalAmount: Number(totalAmount.toFixed(2)),
      forceReExport,
    },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return {
    export: exportRecord,
    csv: csvData,
    statementsIncluded: statements.length,
    statementsSkipped: 0,
    totalAmount: Number(totalAmount.toFixed(2)),
  };
}
