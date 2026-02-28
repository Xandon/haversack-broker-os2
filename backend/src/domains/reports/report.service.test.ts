import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createReportService } from './report.service';

function createMockPrisma() {
  return {
    account: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    order: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    product: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    commission: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    activity: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
  } as unknown as Parameters<typeof createReportService>[0];
}

describe('ReportService', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let service: ReturnType<typeof createReportService>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = createReportService(prisma);
  });

  it('FR-025: runs report on account entity with selected columns', async () => {
    const mockAccounts = [
      { id: 'a1', name: 'Store A', city: 'Portland', state: 'OR' },
      { id: 'a2', name: 'Store B', city: 'Seattle', state: 'WA' },
    ];
    (prisma.account.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockAccounts);
    (prisma.account.count as ReturnType<typeof vi.fn>).mockResolvedValue(2);

    const result = await service.runReport('tenant-1', 'account', [], ['name', 'city', 'state']);

    expect(result.rows).toHaveLength(2);
    expect(result.totalCount).toBe(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
    expect(prisma.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-1', deletedAt: null },
        select: { id: true, name: true, city: true, state: true },
      }),
    );
  });

  it('FR-025: applies filter operators correctly', async () => {
    (prisma.order.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.order.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    await service.runReport(
      'tenant-1',
      'order',
      [
        { field: 'status', operator: 'eq', value: 'confirmed' },
        { field: 'total', operator: 'gte', value: 1000 },
      ],
      ['orderNumber', 'status', 'total'],
    );

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          status: 'confirmed',
          total: { gte: 1000 },
        },
      }),
    );
  });

  it('FR-025: applies contains filter for text search', async () => {
    (prisma.account.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.account.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    await service.runReport(
      'tenant-1',
      'account',
      [{ field: 'name', operator: 'contains', value: 'Portland' }],
      ['name', 'city'],
    );

    expect(prisma.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { contains: 'Portland', mode: 'insensitive' },
        }),
      }),
    );
  });

  it('FR-025: paginates results correctly', async () => {
    (prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.product.count as ReturnType<typeof vi.fn>).mockResolvedValue(100);

    const result = await service.runReport(
      'tenant-1',
      'product',
      [],
      ['name', 'sku'],
      'name',
      'asc',
      3,
      25,
    );

    expect(result.page).toBe(3);
    expect(result.limit).toBe(25);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 50,
        take: 25,
        orderBy: { name: 'asc' },
      }),
    );
  });

  it('FR-025: sorts by specified column and order', async () => {
    (prisma.commission.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.commission.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    await service.runReport('tenant-1', 'commission', [], ['period', 'amount'], 'amount', 'desc');

    expect(prisma.commission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { amount: 'desc' },
      }),
    );
  });

  it('FR-025: rejects unsupported entity type', async () => {
    await expect(service.runReport('tenant-1', 'invalid', [], ['name'])).rejects.toThrow(
      'Unsupported entity type: invalid',
    );
  });

  it('FR-025: ignores invalid column names in filters', async () => {
    (prisma.account.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.account.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    await service.runReport(
      'tenant-1',
      'account',
      [{ field: 'invalidColumn', operator: 'eq', value: 'test' }],
      ['name'],
    );

    expect(prisma.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-1', deletedAt: null },
      }),
    );
  });

  it('AC-025b: exports all rows without pagination', async () => {
    const mockRows = Array.from({ length: 500 }, (_, i) => ({
      id: `o${i}`,
      orderNumber: `ORD-${i}`,
      total: i * 100,
    }));
    (prisma.order.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockRows);

    const result = await service.exportReport('tenant-1', 'order', [], ['orderNumber', 'total']);

    expect(result).toHaveLength(500);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.not.objectContaining({ skip: expect.anything(), take: expect.anything() }),
    );
  });

  it('FR-025: returns available columns for entity type', () => {
    const columns = service.getAvailableColumns('account');
    expect(columns.length).toBeGreaterThan(0);
    expect(columns[0]).toEqual(expect.objectContaining({ key: 'name', label: 'Name' }));
  });

  it('FR-025: returns empty columns for unknown entity type', () => {
    const columns = service.getAvailableColumns('unknown');
    expect(columns).toEqual([]);
  });

  it('FR-025: runs report on activity entity', async () => {
    const mockActivities = [{ id: 'act1', activityType: 'call', subject: 'Follow-up' }];
    (prisma.activity.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockActivities);
    (prisma.activity.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);

    const result = await service.runReport('tenant-1', 'activity', [], ['activityType', 'subject']);

    expect(result.rows).toHaveLength(1);
    expect(result.totalCount).toBe(1);
  });

  it('FR-025: applies in-list filter', async () => {
    (prisma.order.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.order.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    await service.runReport(
      'tenant-1',
      'order',
      [{ field: 'status', operator: 'in', value: ['draft', 'confirmed'] }],
      ['orderNumber', 'status'],
    );

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['draft', 'confirmed'] },
        }),
      }),
    );
  });

  it('FR-025: applies neq filter', async () => {
    (prisma.account.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.account.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    await service.runReport(
      'tenant-1',
      'account',
      [{ field: 'isActive', operator: 'neq', value: false }],
      ['name', 'isActive'],
    );

    expect(prisma.account.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: { not: false },
        }),
      }),
    );
  });
});
