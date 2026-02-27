import type { PrismaClient } from '@prisma/client';
import type { ReportEntityType, ReportFilters, ColumnMetadata } from '@haversack/shared';
import { getColumnMetadata } from './column-registry';

export class ReportExecutionError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'ReportExecutionError';
    this.code = code;
  }
}

const MAX_ROWS_INLINE = 10000;
const MAX_ROWS_EXPORT = 50000;

export interface ReportDefinition {
  entityType: ReportEntityType;
  filters: ReportFilters;
  columns: string[];
}

export interface ExecuteResult {
  data: Record<string, unknown>[];
  pagination: { cursor: string | null; hasMore: boolean; total: number };
  truncated: boolean;
  columns: ColumnMetadata[];
}

interface RedisLike {
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
}

const ENTITY_MODEL_MAP: Record<string, string> = {
  ACCOUNT: 'account',
  ORDER: 'order',
  PRODUCT: 'product',
  COMMISSION: 'commissionEntry',
  ACTIVITY: 'activity',
};

export async function checkConcurrencyLimit(
  redis: RedisLike | null,
  tenantId: string,
): Promise<void> {
  if (!redis) return;
  const key = `report:concurrent:${tenantId}`;
  const count = await redis.incr(key);
  await redis.expire(key, 60);
  if (count > 3) {
    await redis.decr(key);
    throw new ReportExecutionError(
      'Too many concurrent report executions. Maximum 3 per tenant.',
      'REPORT_CONCURRENCY_LIMIT',
    );
  }
}

export async function releaseConcurrencyLimit(
  redis: RedisLike | null,
  tenantId: string,
): Promise<void> {
  if (!redis) return;
  const key = `report:concurrent:${tenantId}`;
  await redis.decr(key);
}

export function buildWhereClause(
  tenantId: string,
  entityType: ReportEntityType,
  filters: ReportFilters,
): Record<string, unknown> {
  const where: Record<string, unknown> = { tenantId };

  // Soft delete filtering
  if (entityType === 'ACCOUNT' || entityType === 'ORDER') {
    where['deletedAt'] = null;
  }

  // Date range filter
  if (filters.dateRange) {
    const dateField = entityType === 'COMMISSION' ? 'calculatedAt' : 'createdAt';
    where[dateField] = {
      gte: new Date(filters.dateRange.start + 'T00:00:00.000Z'),
      lte: new Date(filters.dateRange.end + 'T23:59:59.999Z'),
    };
  }

  // Territory filter (entity-specific)
  if (filters.territoryId) {
    if (entityType === 'ACCOUNT') {
      where['territoryId'] = filters.territoryId;
    } else if (entityType === 'ORDER') {
      where['account'] = { territoryId: filters.territoryId };
    }
  }

  // Rep filter
  if (filters.repId) {
    if (entityType === 'ORDER') {
      where['createdById'] = filters.repId;
    } else if (entityType === 'ACTIVITY') {
      where['userId'] = filters.repId;
    } else if (entityType === 'COMMISSION') {
      where['repId'] = filters.repId;
    }
  }

  // Status filter
  if (filters.status) {
    where['status'] = filters.status;
  }

  // Brand filter
  if (filters.brandId) {
    if (entityType === 'PRODUCT') {
      where['brandId'] = filters.brandId;
    }
  }

  return where;
}

export async function executeReport(
  prisma: PrismaClient,
  redis: RedisLike | null,
  tenantId: string,
  reportDef: ReportDefinition,
  options: { cursor?: string | null; limit?: number; forExport?: boolean },
): Promise<ExecuteResult> {
  await checkConcurrencyLimit(redis, tenantId);

  try {
    const modelName = ENTITY_MODEL_MAP[reportDef.entityType];
    if (!modelName) {
      throw new ReportExecutionError(`Unsupported entity type: ${reportDef.entityType}`, 'REPORT_INVALID_ENTITY');
    }

    const where = buildWhereClause(tenantId, reportDef.entityType, reportDef.filters);
    const maxRows = options.forExport ? MAX_ROWS_EXPORT : MAX_ROWS_INLINE;
    const limit = Math.min(options.limit ?? 50, maxRows);

    // Get the Prisma model dynamically
    const model = (prisma as Record<string, unknown>)[modelName] as {
      findMany: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
      count: (args: Record<string, unknown>) => Promise<number>;
    };

    const [results, total] = await Promise.all([
      model.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        cursor: options.cursor ? { id: options.cursor } : undefined,
        skip: options.cursor ? 1 : 0,
      }),
      model.count({ where }),
    ]);

    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;
    const nextCursor = hasMore && data.length > 0 ? (data[data.length - 1]!['id'] as string) : null;
    const truncated = total > maxRows;

    // Format rows to only include requested columns
    const formattedData = data.map((row) => formatRow(row, reportDef.columns, reportDef.entityType));
    const columns = getColumnMetadata(reportDef.entityType, reportDef.columns);

    return {
      data: formattedData,
      pagination: { cursor: nextCursor, hasMore, total },
      truncated,
      columns,
    };
  } finally {
    await releaseConcurrencyLimit(redis, tenantId);
  }
}

function formatRow(
  row: Record<string, unknown>,
  columns: string[],
  _entityType: ReportEntityType,
): Record<string, unknown> {
  const formatted: Record<string, unknown> = {};

  for (const col of columns) {
    const value = resolveColumnValue(row, col);
    formatted[col] = value;
  }

  return formatted;
}

function resolveColumnValue(row: Record<string, unknown>, columnKey: string): unknown {
  // Handle relation-based columns
  if (columnKey === 'accountName') {
    const account = row['account'] as Record<string, unknown> | undefined;
    return account?.['name'] ?? null;
  }
  if (columnKey === 'brandName') {
    const brand = row['brand'] as Record<string, unknown> | undefined;
    return brand?.['name'] ?? null;
  }
  if (columnKey === 'repName') {
    const rep = (row['rep'] ?? row['user']) as Record<string, unknown> | undefined;
    if (rep) return `${rep['firstName']} ${rep['lastName']}`;
    return null;
  }
  if (columnKey === 'territoryName') {
    const territory = row['territory'] as Record<string, unknown> | undefined;
    return territory?.['name'] ?? null;
  }
  if (columnKey === 'orderNumber' && row['order']) {
    const order = row['order'] as Record<string, unknown>;
    return order['orderNumber'] ?? null;
  }

  // Direct field access
  const value = row[columnKey];

  // Convert Decimal to number
  if (value !== null && value !== undefined && typeof value === 'object' && 'toNumber' in (value as Record<string, unknown>)) {
    return (value as { toNumber(): number }).toNumber();
  }

  // Convert Date to ISO string
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value ?? null;
}
