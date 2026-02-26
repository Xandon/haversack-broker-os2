import type { PrismaClient } from '@prisma/client';

const ACTIVITY_TYPES = ['visit', 'call', 'email', 'demo', 'sampling'] as const;

interface MetricsGroupRow {
  group_id: string;
  group_name: string;
  activity_type: string;
  count: bigint;
  last_activity: Date;
}

interface MetricsGroup {
  id: string;
  name: string;
  counts: Record<string, number>;
  total: number;
  lastActivityDate: string;
}

interface MetricsResult {
  groups: MetricsGroup[];
  totals: Record<string, number>;
}

export async function getActivityMetrics(
  prisma: PrismaClient,
  tenantId: string,
  options: {
    startDate: string;
    endDate: string;
    groupBy: 'rep' | 'account' | 'type';
  },
): Promise<MetricsResult> {
  const { startDate, endDate, groupBy } = options;

  let groupIdColumn: string;
  let groupNameColumn: string;
  let joinClause: string;

  switch (groupBy) {
    case 'rep':
      groupIdColumn = 'a.user_id';
      groupNameColumn = "COALESCE(u.first_name || ' ' || u.last_name, u.email)";
      joinClause = 'LEFT JOIN users u ON a.user_id = u.id';
      break;
    case 'account':
      groupIdColumn = 'a.account_id';
      groupNameColumn = 'acc.name';
      joinClause = 'LEFT JOIN accounts acc ON a.account_id = acc.id';
      break;
    case 'type':
      groupIdColumn = 'a.type::text';
      groupNameColumn = 'a.type::text';
      joinClause = '';
      break;
  }

  const query = `
    SELECT
      ${groupIdColumn} AS group_id,
      ${groupNameColumn} AS group_name,
      a.type::text AS activity_type,
      COUNT(*)::bigint AS count,
      MAX(a.occurred_at) AS last_activity
    FROM activities a
    ${joinClause}
    WHERE a.tenant_id = $1
      AND a.occurred_at >= $2
      AND a.occurred_at <= $3
      AND a.deleted_at IS NULL
    GROUP BY ${groupIdColumn}, ${groupNameColumn}, a.type
    ORDER BY ${groupIdColumn}, a.type
  `;

  const rows = await prisma.$queryRawUnsafe<MetricsGroupRow[]>(
    query,
    tenantId,
    new Date(startDate),
    new Date(endDate),
  );

  // Aggregate rows into groups
  const groupMap = new Map<string, MetricsGroup>();
  const totals: Record<string, number> = {};
  for (const type of ACTIVITY_TYPES) {
    totals[type] = 0;
  }

  for (const row of rows) {
    const count = Number(row.count);

    if (!groupMap.has(row.group_id)) {
      const counts: Record<string, number> = {};
      for (const type of ACTIVITY_TYPES) {
        counts[type] = 0;
      }
      groupMap.set(row.group_id, {
        id: row.group_id,
        name: row.group_name,
        counts,
        total: 0,
        lastActivityDate: row.last_activity.toISOString(),
      });
    }

    const group = groupMap.get(row.group_id)!;
    group.counts[row.activity_type] = count;
    group.total += count;

    // Track the most recent activity date per group
    const rowDate = row.last_activity.toISOString();
    if (rowDate > group.lastActivityDate) {
      group.lastActivityDate = rowDate;
    }

    // Aggregate totals
    totals[row.activity_type] = (totals[row.activity_type] ?? 0) + count;
  }

  return {
    groups: Array.from(groupMap.values()),
    totals,
  };
}
