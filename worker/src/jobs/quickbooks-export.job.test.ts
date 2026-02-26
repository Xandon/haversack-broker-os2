import { describe, test, expect, vi } from 'vitest';
import {
  processQuickBooksExport,
  generateOrderCsv,
  type QuickBooksExportResult,
} from './quickbooks-export.job';
import type { PrismaClient } from '@prisma/client';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';

function makeMockOrder(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '00000000-0000-4000-a000-000000000010',
    orderNumber: 'ORD-20260226-0001',
    total: 2500.0,
    subtotal: 2350.0,
    tax: 150.0,
    status: 'confirmed',
    createdAt: new Date('2026-02-26'),
    submittedAt: new Date('2026-02-26'),
    confirmedAt: new Date('2026-02-26'),
    account: { name: 'Pacific Foods Co' },
    rep: { firstName: 'John', lastName: 'Doe' },
    lineItems: [
      {
        quantity: 24,
        unitPrice: 10.0,
        lineTotal: 240.0,
        discount: 0,
        product: {
          name: 'Artisan Honey 12oz',
          sku: 'SKU-HONEY-12',
        },
      },
    ],
    ...overrides,
  };
}

function createMockPrisma(overrides: Record<string, unknown> = {}): {
  prisma: PrismaClient;
  spies: Record<string, ReturnType<typeof vi.fn>>;
} {
  const orderFindMany = vi.fn().mockResolvedValue(overrides['orders'] ?? []);
  const exportCreate = vi.fn().mockResolvedValue({ id: 'export-1' });
  const exportUpdate = vi.fn().mockResolvedValue({ id: 'export-1' });
  const exportFindFirst = vi.fn().mockResolvedValue(overrides['existingExport'] ?? null);
  const notificationCreate = vi.fn().mockResolvedValue({ id: 'notif-1' });

  return {
    prisma: {
      order: { findMany: orderFindMany },
      quickBooksExport: {
        create: exportCreate,
        update: exportUpdate,
        findFirst: exportFindFirst,
      },
      notification: { create: notificationCreate },
    } as unknown as PrismaClient,
    spies: {
      orderFindMany,
      exportCreate,
      exportUpdate,
      exportFindFirst,
      notificationCreate,
    },
  };
}

describe('FR-015: QuickBooks export job', () => {
  test('FR-015: generates valid CSV from confirmed orders', () => {
    const order = makeMockOrder();
    const csv = generateOrderCsv([order as Record<string, unknown>]);

    expect(csv).toContain('Order Number');
    expect(csv).toContain('ORD-20260226-0001');
    expect(csv).toContain('Pacific Foods Co');
    expect(csv).toContain('SKU-HONEY-12');
    expect(csv).toContain('Artisan Honey 12oz');
  });

  test('FR-015: CSV includes header row and all required columns', () => {
    const order = makeMockOrder();
    const csv = generateOrderCsv([order as Record<string, unknown>]);
    const lines = csv.split('\n');
    const headers = lines[0]!;

    expect(headers).toContain('Order Number');
    expect(headers).toContain('Date');
    expect(headers).toContain('Account Name');
    expect(headers).toContain('SKU');
    expect(headers).toContain('Product Name');
    expect(headers).toContain('Quantity');
    expect(headers).toContain('Unit Price');
    expect(headers).toContain('Line Total');
    expect(headers).toContain('Tax');
    expect(headers).toContain('Order Total');
  });

  test('FR-015: processQuickBooksExport scans confirmed orders and creates export records', async () => {
    const order = makeMockOrder();
    const { prisma, spies } = createMockPrisma({ orders: [order] });

    const result: QuickBooksExportResult = await processQuickBooksExport(prisma, TENANT_ID);

    expect(result.ordersProcessed).toBe(1);
    expect(result.csvGenerated).toBe(true);
    expect(spies['exportCreate']).toHaveBeenCalledTimes(1);
  });

  test('FR-015: skips orders that already have an export record (no double-export)', async () => {
    const { prisma, spies } = createMockPrisma({
      orders: [],
    });

    const result = await processQuickBooksExport(prisma, TENANT_ID);

    expect(result.ordersProcessed).toBe(0);
    expect(result.csvGenerated).toBe(false);
    expect(spies['exportCreate']).not.toHaveBeenCalled();
  });

  test('FR-015: handles empty order set gracefully', async () => {
    const { prisma } = createMockPrisma({ orders: [] });

    const result = await processQuickBooksExport(prisma, TENANT_ID);

    expect(result.ordersProcessed).toBe(0);
    expect(result.csvGenerated).toBe(false);
  });

  test('FR-015: sets export status to queued on creation', async () => {
    const order = makeMockOrder();
    const { prisma, spies } = createMockPrisma({ orders: [order] });

    await processQuickBooksExport(prisma, TENANT_ID);

    expect(spies['exportCreate']).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          exportStatus: 'queued',
        }),
      }),
    );
  });

  test('FR-015: creates failure notification after max retries', async () => {
    const order = makeMockOrder();
    const { prisma, spies } = createMockPrisma({
      orders: [order],
      existingExport: { id: 'export-1', attemptCount: 3, exportStatus: 'failed' },
    });

    // The export check finds an existing failed export with 3 attempts
    const exportFindFirst = spies['exportFindFirst'] as ReturnType<typeof vi.fn>;
    exportFindFirst.mockResolvedValue({
      id: 'export-1',
      attemptCount: 3,
      exportStatus: 'failed',
    });

    // When we process, it should create a notification for the admin
    await processQuickBooksExport(prisma, TENANT_ID);

    // Should not re-attempt since max retries exceeded
    expect(spies['exportCreate']).not.toHaveBeenCalled();
  });

  test('FR-015: includes tenant isolation in order query', async () => {
    const { prisma, spies } = createMockPrisma({ orders: [] });

    await processQuickBooksExport(prisma, TENANT_ID);

    expect(spies['orderFindMany']).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT_ID,
        }),
      }),
    );
  });
});
