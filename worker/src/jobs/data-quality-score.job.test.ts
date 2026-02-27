import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processDataQualityScore } from './data-quality-score.job';
import type { PrismaClient } from '@prisma/client';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';

function createMockPrisma(): Record<string, unknown> {
  return {
    account: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    contact: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    product: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    dataQualityScore: {
      create: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'score-1',
        ...data,
        createdAt: new Date(),
      })),
    },
  };
}

describe('FR-029: Data quality score worker job', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  it('FR-029: calculates and stores quality score', async () => {
    const result = await processDataQualityScore(
      mockPrisma as unknown as PrismaClient,
      TENANT_ID,
      'cron',
    );

    expect(result.id).toBe('score-1');
    expect(result.compositeScore).toBe(100);
    expect((mockPrisma.dataQualityScore as { create: ReturnType<typeof vi.fn> }).create).toHaveBeenCalledOnce();
  });

  it('FR-029: detects quality issues in data', async () => {
    (mockPrisma.account as { findMany: ReturnType<typeof vi.fn> }).findMany.mockResolvedValue([
      { id: '1', name: 'Incomplete', accountType: null, phone: null, email: null, address: null },
    ]);

    const result = await processDataQualityScore(
      mockPrisma as unknown as PrismaClient,
      TENANT_ID,
      'cron',
    );

    expect(result.compositeScore).toBeLessThan(100);
  });

  it('FR-029: returns score id in result', async () => {
    const result = await processDataQualityScore(
      mockPrisma as unknown as PrismaClient,
      TENANT_ID,
      'manual',
    );

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('compositeScore');
  });
});
