import type { PrismaClient, Account } from '@prisma/client';

export interface SearchResult {
  data: Account[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
  };
}

export interface SearchOptions {
  query: string;
  territoryId?: string;
  accountType?: string;
  limit?: number;
  cursor?: string;
}

export async function searchAccounts(
  prisma: PrismaClient,
  tenantId: string,
  options: SearchOptions,
): Promise<SearchResult> {
  const { query, territoryId, accountType, limit = 20, cursor } = options;

  // Use pg_trgm similarity search via raw query for relevance ranking
  // Falls back to ILIKE for basic matching when pg_trgm is not available
  const searchPattern = `%${query}%`;

  // Build WHERE conditions
  const conditions: string[] = [
    `a.tenant_id = $1`,
    `a.deleted_at IS NULL`,
  ];
  const params: (string | number)[] = [tenantId];
  let paramIndex = 2;

  // Search across account name, city, and contact fields
  conditions.push(`(
    a.name ILIKE $${paramIndex} OR
    a.city ILIKE $${paramIndex} OR
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.account_id = a.id
        AND c.deleted_at IS NULL
        AND (
          c.first_name ILIKE $${paramIndex} OR
          c.last_name ILIKE $${paramIndex} OR
          c.email ILIKE $${paramIndex} OR
          c.phone ILIKE $${paramIndex}
        )
    ) OR
    EXISTS (
      SELECT 1 FROM territories t
      WHERE t.id = a.territory_id
        AND t.name ILIKE $${paramIndex}
    )
  )`);
  params.push(searchPattern);
  paramIndex++;

  if (territoryId) {
    conditions.push(`a.territory_id = $${paramIndex}`);
    params.push(territoryId);
    paramIndex++;
  }

  if (accountType) {
    conditions.push(`a.account_type = $${paramIndex}`);
    params.push(accountType);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  // Count query
  const countQuery = `SELECT COUNT(*)::int as total FROM accounts a WHERE ${whereClause}`;
  const countResult = await prisma.$queryRawUnsafe<Array<{ total: number }>>(
    countQuery,
    ...params,
  );
  const total = countResult[0]?.total ?? 0;

  // Data query with relevance ordering (name match first, then others)
  let dataQuery = `
    SELECT a.*,
      CASE
        WHEN a.name ILIKE $${params.indexOf(searchPattern) + 1} THEN 1
        ELSE 2
      END as relevance_rank
    FROM accounts a
    WHERE ${whereClause}
    ORDER BY relevance_rank ASC, a.name ASC
    LIMIT $${paramIndex}
  `;
  params.push(limit + 1);
  paramIndex++;

  if (cursor) {
    // For cursor-based pagination, use OFFSET (simplified)
    dataQuery = `
      SELECT a.*,
        CASE
          WHEN a.name ILIKE $${params.indexOf(searchPattern) + 1} THEN 1
          ELSE 2
        END as relevance_rank
      FROM accounts a
      WHERE ${whereClause} AND a.id > $${paramIndex}
      ORDER BY relevance_rank ASC, a.name ASC
      LIMIT $${paramIndex - 1}
    `;
    params.push(cursor);
  }

  const results = await prisma.$queryRawUnsafe<Array<Account & { relevance_rank: number }>>(
    dataQuery,
    ...params,
  );

  const hasMore = results.length > limit;
  const data = hasMore ? results.slice(0, limit) : results;
  const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;

  return {
    data: data.map(({ relevance_rank: _, ...account }) => account as Account),
    pagination: { cursor: nextCursor, hasMore, total },
  };
}
