import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createDataQualityService } from './data-quality.service';

function makePrisma() {
  return {
    account: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    contact: {
      findMany: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
  } as unknown as Parameters<typeof createDataQualityService>[0];
}

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000001';

describe('DataQualityService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: ReturnType<typeof createDataQualityService>;

  beforeEach(() => {
    prisma = makePrisma();
    service = createDataQualityService(prisma);
  });

  describe('getScorecard', () => {
    function setupDefaultMocks() {
      // Accounts with complete fields
      (prisma.account.findMany as ReturnType<typeof vi.fn>).mockImplementation(
        ({ select }: { select: Record<string, boolean> }) => {
          if ('name' in select && 'phone' in select) {
            // accountCompleteness query
            return Promise.resolve([
              {
                name: 'Acme',
                addressLine1: '123 Main',
                city: 'Seattle',
                state: 'WA',
                zipCode: '98101',
                phone: '555-1234',
                email: 'a@b.com',
              },
              {
                name: 'Beta',
                addressLine1: '456 Oak',
                city: 'Portland',
                state: 'OR',
                zipCode: '97201',
                phone: null,
                email: null,
              },
            ]);
          }
          // duplicateAccounts query
          return Promise.resolve([{ name: 'Acme' }, { name: 'Beta' }]);
        },
      );

      (prisma.account.count as ReturnType<typeof vi.fn>).mockImplementation(
        ({ where }: { where: Record<string, unknown> }) => {
          if ('updatedAt' in where) {
            return Promise.resolve(0); // no stale
          }
          return Promise.resolve(2); // total
        },
      );

      (prisma.contact.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { email: 'valid@example.com' },
        { email: 'invalid-email' },
      ]);

      (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { imageUrl: 'https://example.com/img.jpg' },
        { imageUrl: null },
      ]);
    }

    it('FR-029: returns composite score from all metrics', async () => {
      setupDefaultMocks();

      const result = await service.getScorecard(TENANT);

      expect(result.metrics).toHaveLength(5);
      expect(result.compositeScore).toBeGreaterThanOrEqual(0);
      expect(result.compositeScore).toBeLessThanOrEqual(100);
      expect(result.calculatedAt).toBeTruthy();
    });

    it('FR-029: computes account completeness percentage', async () => {
      setupDefaultMocks();

      const result = await service.getScorecard(TENANT);
      const metric = result.metrics.find((m) => m.key === 'account_completeness');

      expect(metric).toBeDefined();
      expect(metric!.value).toBe(1); // 1 out of 2 complete
      expect(metric!.total).toBe(2);
      expect(metric!.percentage).toBe(50);
    });

    it('FR-029: computes contact email validity', async () => {
      setupDefaultMocks();

      const result = await service.getScorecard(TENANT);
      const metric = result.metrics.find((m) => m.key === 'contact_email_validity');

      expect(metric).toBeDefined();
      expect(metric!.value).toBe(1);
      expect(metric!.total).toBe(2);
      expect(metric!.percentage).toBe(50);
    });

    it('FR-029: computes product image coverage', async () => {
      setupDefaultMocks();

      const result = await service.getScorecard(TENANT);
      const metric = result.metrics.find((m) => m.key === 'product_images');

      expect(metric).toBeDefined();
      expect(metric!.value).toBe(1);
      expect(metric!.total).toBe(2);
      expect(metric!.percentage).toBe(50);
    });

    it('FR-029: detects duplicate accounts by name', async () => {
      (prisma.account.findMany as ReturnType<typeof vi.fn>).mockImplementation(
        ({ select }: { select: Record<string, boolean> }) => {
          if ('name' in select && 'phone' in select) {
            return Promise.resolve([]);
          }
          return Promise.resolve([{ name: 'Acme' }, { name: 'acme' }, { name: 'Beta' }]);
        },
      );
      (prisma.account.count as ReturnType<typeof vi.fn>).mockResolvedValue(3);
      (prisma.contact.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.getScorecard(TENANT);
      const metric = result.metrics.find((m) => m.key === 'duplicate_accounts');

      expect(metric).toBeDefined();
      expect(metric!.value).toBe(1); // 1 non-duplicate (Beta)
      expect(metric!.total).toBe(3);
      expect(metric!.percentage).toBe(33);
    });

    it('FR-029: computes stale account count', async () => {
      (prisma.account.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.account.count as ReturnType<typeof vi.fn>).mockImplementation(
        ({ where }: { where: Record<string, unknown> }) => {
          if ('updatedAt' in where) {
            return Promise.resolve(3); // 3 stale
          }
          return Promise.resolve(10); // 10 total
        },
      );
      (prisma.contact.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.getScorecard(TENANT);
      const metric = result.metrics.find((m) => m.key === 'stale_accounts');

      expect(metric).toBeDefined();
      expect(metric!.value).toBe(7); // 10-3 active
      expect(metric!.total).toBe(10);
      expect(metric!.percentage).toBe(70);
    });

    it('AC-029a: scorecard has calculatedAt timestamp', async () => {
      setupDefaultMocks();

      const result = await service.getScorecard(TENANT);

      expect(new Date(result.calculatedAt).getTime()).not.toBeNaN();
    });

    it('FR-029: handles empty data gracefully with 100% scores', async () => {
      (prisma.account.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.account.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (prisma.contact.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.getScorecard(TENANT);

      expect(result.compositeScore).toBe(100);
      result.metrics.forEach((m) => {
        expect(m.percentage).toBe(100);
      });
    });

    it('FR-029: each metric includes weight for composite calculation', async () => {
      setupDefaultMocks();

      const result = await service.getScorecard(TENANT);
      const totalWeight = result.metrics.reduce((sum, m) => sum + m.weight, 0);

      expect(totalWeight).toBe(100);
      result.metrics.forEach((m) => {
        expect(m.weight).toBeGreaterThan(0);
      });
    });
  });
});
