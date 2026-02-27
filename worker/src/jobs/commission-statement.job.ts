import type { PrismaClient } from '@prisma/client';

export interface CommissionStatementResult {
  month: number;
  year: number;
  statementsGenerated: number;
  totalReps: number;
  skippedExisting: number;
}

/**
 * Process monthly commission statement generation.
 *
 * For each active rep, aggregates their CommissionEntry records for the given
 * month/year period, calculates YTD totals, and creates CommissionStatement
 * records. Reps with no entries still get a zero-amount statement.
 *
 * This job runs on the 1st of every month at 03:00 UTC via cron,
 * or can be triggered manually by an admin.
 */
export async function processCommissionStatements(
  prisma: PrismaClient,
  tenantId: string,
  month: number,
  year: number,
): Promise<CommissionStatementResult> {
  // Find all active reps for the tenant
  const reps = await prisma.user.findMany({
    where: {
      tenantId,
      role: 'rep',
      isActive: true,
      deletedAt: null,
    },
    select: { id: true },
  });

  const totalReps = reps.length;
  let statementsGenerated = 0;
  let skippedExisting = 0;

  // Date range for the statement month
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 1);
  const ytdStart = new Date(year, 0, 1);

  for (const rep of reps) {
    // Check if a statement already exists for this rep/month/year
    const existing = await prisma.commissionStatement.findFirst({
      where: { tenantId, repId: rep.id, month, year },
    });

    if (existing) {
      skippedExisting++;
      continue;
    }

    // Aggregate commission entries for this rep in the period
    const periodAggregation = await prisma.commissionEntry.aggregate({
      where: {
        tenantId,
        repId: rep.id,
        statementId: null,
        calculatedAt: { gte: periodStart, lt: periodEnd },
      },
      _sum: { commissionAmount: true },
    });

    const totalEarned = Number(periodAggregation._sum.commissionAmount ?? 0);

    // Calculate YTD total
    const ytdAggregation = await prisma.commissionEntry.aggregate({
      where: {
        tenantId,
        repId: rep.id,
        calculatedAt: { gte: ytdStart, lt: periodEnd },
      },
      _sum: { commissionAmount: true },
    });

    const ytdTotal = Number(ytdAggregation._sum.commissionAmount ?? 0);

    // Get unlinked entries for this period
    const unlinkedEntries = await prisma.commissionEntry.findMany({
      where: {
        tenantId,
        repId: rep.id,
        statementId: null,
        calculatedAt: { gte: periodStart, lt: periodEnd },
      },
      select: { id: true },
    });

    // Create statement and link entries in a transaction
    await prisma.$transaction(async (tx) => {
      const statement = await tx.commissionStatement.create({
        data: {
          tenantId,
          repId: rep.id,
          month,
          year,
          totalEarned,
          ytdTotal,
        },
      });

      if (unlinkedEntries.length > 0) {
        await tx.commissionEntry.updateMany({
          where: {
            id: { in: unlinkedEntries.map((e) => e.id) },
            tenantId,
          },
          data: { statementId: statement.id },
        });
      }
    });

    statementsGenerated++;
  }

  return {
    month,
    year,
    statementsGenerated,
    totalReps,
    skippedExisting,
  };
}
