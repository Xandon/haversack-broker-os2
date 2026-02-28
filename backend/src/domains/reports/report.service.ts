import { REPORT_ENTITY_COLUMNS } from '@haversack/shared';
import type { ReportFilter } from '@haversack/shared';
import { PrismaClient } from '@prisma/client';

export interface ReportResult {
  rows: Record<string, unknown>[];
  totalCount: number;
  page: number;
  limit: number;
}

const ENTITY_MODEL_MAP: Record<string, string> = {
  account: 'account',
  order: 'order',
  product: 'product',
  commission: 'commission',
  activity: 'activity',
};

function buildWhereClause(
  tenantId: string,
  entityType: string,
  filters: ReportFilter[],
): Record<string, unknown> {
  const where: Record<string, unknown> = { tenantId };

  if (entityType === 'account') {
    where['deletedAt'] = null;
  }

  for (const filter of filters) {
    const validColumns = REPORT_ENTITY_COLUMNS[entityType]?.map((c) => c.key) ?? [];
    if (!validColumns.includes(filter.field)) continue;

    switch (filter.operator) {
      case 'eq':
        where[filter.field] = filter.value;
        break;
      case 'neq':
        where[filter.field] = { not: filter.value };
        break;
      case 'gt':
        where[filter.field] = { gt: filter.value };
        break;
      case 'gte':
        where[filter.field] = { gte: filter.value };
        break;
      case 'lt':
        where[filter.field] = { lt: filter.value };
        break;
      case 'lte':
        where[filter.field] = { lte: filter.value };
        break;
      case 'contains':
        where[filter.field] = { contains: String(filter.value), mode: 'insensitive' };
        break;
      case 'in':
        where[filter.field] = { in: Array.isArray(filter.value) ? filter.value : [filter.value] };
        break;
    }
  }

  return where;
}

function buildSelect(entityType: string, columns: string[]): Record<string, boolean> {
  const validColumns = REPORT_ENTITY_COLUMNS[entityType]?.map((c) => c.key) ?? [];
  const select: Record<string, boolean> = { id: true };
  for (const col of columns) {
    if (validColumns.includes(col)) {
      select[col] = true;
    }
  }
  return select;
}

export function createReportService(prisma: PrismaClient) {
  return {
    async runReport(
      tenantId: string,
      entityType: string,
      filters: ReportFilter[],
      columns: string[],
      sortBy?: string,
      sortOrder: 'asc' | 'desc' = 'desc',
      page = 1,
      limit = 50,
    ): Promise<ReportResult> {
      const modelName = ENTITY_MODEL_MAP[entityType];
      if (!modelName) {
        throw new Error(`Unsupported entity type: ${entityType}`);
      }

      const where = buildWhereClause(tenantId, entityType, filters);
      const select = buildSelect(entityType, columns);

      const validColumns = REPORT_ENTITY_COLUMNS[entityType]?.map((c) => c.key) ?? [];
      const orderByField = sortBy && validColumns.includes(sortBy) ? sortBy : 'createdAt';

      const model = prisma[modelName as keyof PrismaClient] as Record<string, unknown>;
      const findMany = model['findMany'] as (args: Record<string, unknown>) => Promise<unknown[]>;
      const count = model['count'] as (args: Record<string, unknown>) => Promise<number>;

      const [rows, totalCount] = await Promise.all([
        findMany({
          where,
          select,
          orderBy: { [orderByField]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
        count({ where }),
      ]);

      return {
        rows: rows as Record<string, unknown>[],
        totalCount,
        page,
        limit,
      };
    },

    async exportReport(
      tenantId: string,
      entityType: string,
      filters: ReportFilter[],
      columns: string[],
      sortBy?: string,
      sortOrder: 'asc' | 'desc' = 'desc',
    ): Promise<Record<string, unknown>[]> {
      const modelName = ENTITY_MODEL_MAP[entityType];
      if (!modelName) {
        throw new Error(`Unsupported entity type: ${entityType}`);
      }

      const where = buildWhereClause(tenantId, entityType, filters);
      const select = buildSelect(entityType, columns);

      const validColumns = REPORT_ENTITY_COLUMNS[entityType]?.map((c) => c.key) ?? [];
      const orderByField = sortBy && validColumns.includes(sortBy) ? sortBy : 'createdAt';

      const model = prisma[modelName as keyof PrismaClient] as Record<string, unknown>;
      const findMany = model['findMany'] as (args: Record<string, unknown>) => Promise<unknown[]>;

      const rows = await findMany({
        where,
        select,
        orderBy: { [orderByField]: sortOrder },
      });

      return rows as Record<string, unknown>[];
    },

    getAvailableColumns(entityType: string) {
      return REPORT_ENTITY_COLUMNS[entityType] ?? [];
    },
  };
}

export type ReportService = ReturnType<typeof createReportService>;
