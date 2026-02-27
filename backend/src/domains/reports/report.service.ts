import type { PrismaClient } from '@prisma/client';
import type { CreateReportInput, ReportListQuery, ReportResponse } from '@haversack/shared';
import { validateColumns } from './column-registry';
import { writeAuditLog } from '../../shared/services/audit.service';

export class ReportError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'ReportError';
    this.code = code;
  }
}

export interface AuditContext {
  actorId: string;
  actorEmail: string;
  ipAddress: string;
  userAgent: string;
  requestId: string;
}

const INCLUDE_CREATOR = {
  createdBy: { select: { id: true, firstName: true, lastName: true } },
};

function formatReportResponse(
  report: Record<string, unknown> & { createdBy: { firstName: string; lastName: string } },
): ReportResponse {
  return {
    id: report['id'] as string,
    name: report['name'] as string,
    description: (report['description'] as string) ?? null,
    entityType: report['entityType'] as ReportResponse['entityType'],
    filters: report['filters'] as ReportResponse['filters'],
    columns: report['columns'] as string[],
    isShared: report['isShared'] as boolean,
    createdByName: `${report.createdBy.firstName} ${report.createdBy.lastName}`,
    lastRunAt: report['lastRunAt'] ? (report['lastRunAt'] as Date).toISOString() : null,
    createdAt: (report['createdAt'] as Date).toISOString(),
  };
}

export async function createReport(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  input: CreateReportInput,
  audit: AuditContext,
): Promise<ReportResponse> {
  const invalidColumns = validateColumns(input.entityType, input.columns);
  if (invalidColumns.length > 0) {
    throw new ReportError(
      `Invalid columns for ${input.entityType}: ${invalidColumns.join(', ')}`,
      'REPORT_INVALID_COLUMNS',
    );
  }

  const report = await prisma.savedReport.create({
    data: {
      tenantId,
      createdById: userId,
      name: input.name,
      description: input.description ?? null,
      entityType: input.entityType,
      filters: input.filters as Record<string, unknown>,
      columns: input.columns,
      isShared: input.isShared,
    },
    include: INCLUDE_CREATOR,
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'SavedReport',
    entityId: report.id,
    action: 'create',
    changeSummary: { name: input.name, entityType: input.entityType },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return formatReportResponse(report as unknown as Record<string, unknown> & { createdBy: { firstName: string; lastName: string } });
}

export async function getReport(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  userRole: string,
  reportId: string,
): Promise<ReportResponse> {
  const report = await prisma.savedReport.findFirst({
    where: {
      id: reportId,
      tenantId,
      deletedAt: null,
    },
    include: INCLUDE_CREATOR,
  });

  if (!report) {
    throw new ReportError('Report not found', 'REPORT_NOT_FOUND');
  }

  // Access check: owner, shared, or admin
  if (report.createdById !== userId && !report.isShared && userRole !== 'admin') {
    throw new ReportError('Report not found', 'REPORT_NOT_FOUND');
  }

  return formatReportResponse(report as unknown as Record<string, unknown> & { createdBy: { firstName: string; lastName: string } });
}

export async function listReports(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  query: ReportListQuery,
): Promise<{ data: ReportResponse[]; pagination: { cursor: string | null; hasMore: boolean; total: number } }> {
  const limit = query.limit ?? 20;

  const where = {
    tenantId,
    deletedAt: null,
    OR: [
      { createdById: userId },
      { isShared: true },
    ],
  };

  const [results, total] = await Promise.all([
    prisma.savedReport.findMany({
      where,
      include: INCLUDE_CREATOR,
      orderBy: [{ lastRunAt: 'desc' }, { createdAt: 'desc' }],
      take: limit + 1,
      cursor: query.cursor ? { id: query.cursor } : undefined,
      skip: query.cursor ? 1 : 0,
    }),
    prisma.savedReport.count({ where }),
  ]);

  const hasMore = results.length > limit;
  const data = hasMore ? results.slice(0, limit) : results;
  const nextCursor = hasMore && data.length > 0 ? data[data.length - 1]!.id : null;

  return {
    data: data.map((r) => formatReportResponse(r as unknown as Record<string, unknown> & { createdBy: { firstName: string; lastName: string } })),
    pagination: { cursor: nextCursor, hasMore, total },
  };
}

export async function deleteReport(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  userRole: string,
  reportId: string,
  audit: AuditContext,
): Promise<void> {
  const report = await prisma.savedReport.findFirst({
    where: {
      id: reportId,
      tenantId,
      deletedAt: null,
    },
  });

  if (!report) {
    throw new ReportError('Report not found', 'REPORT_NOT_FOUND');
  }

  // Only owner or admin can delete
  if (report.createdById !== userId && userRole !== 'admin') {
    throw new ReportError('Not authorized to delete this report', 'REPORT_FORBIDDEN');
  }

  await prisma.savedReport.update({
    where: { id: reportId },
    data: { deletedAt: new Date() },
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    entityType: 'SavedReport',
    entityId: reportId,
    action: 'delete',
    changeSummary: { name: report.name },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });
}
