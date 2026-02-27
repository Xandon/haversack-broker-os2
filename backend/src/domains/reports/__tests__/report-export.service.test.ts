import { describe, test, expect, vi } from 'vitest';
import { exportReport, generateExportFilename } from '../report-export.service';
import type { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

function createMockRedis(): {
  incr: ReturnType<typeof vi.fn>;
  decr: ReturnType<typeof vi.fn>;
  expire: ReturnType<typeof vi.fn>;
} {
  return {
    incr: vi.fn().mockResolvedValue(1),
    decr: vi.fn().mockResolvedValue(0),
    expire: vi.fn().mockResolvedValue(1),
  };
}

const TENANT_ID = '00000000-0000-4000-a000-000000000001';

describe('FR-025: Report export service', () => {
  describe('generateExportFilename', () => {
    test('FR-025: generates CSV filename with entity type and date', () => {
      const filename = generateExportFilename('ORDER', 'csv');
      expect(filename).toMatch(/^report-ORDER-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    test('FR-025: generates XLSX filename with entity type and date', () => {
      const filename = generateExportFilename('ACCOUNT', 'xlsx');
      expect(filename).toMatch(/^report-ACCOUNT-\d{4}-\d{2}-\d{2}\.xlsx$/);
    });
  });

  describe('exportReport', () => {
    test('FR-025: exports CSV with UTF-8 BOM and correct headers', async () => {
      const prisma = {
        order: {
          findMany: vi.fn().mockResolvedValue([
            { id: 'o1', orderNumber: 'ORD-001', totalAmount: new Decimal('2500'), createdAt: new Date() },
          ]),
          count: vi.fn().mockResolvedValue(1),
        },
      } as unknown as PrismaClient;

      const redis = createMockRedis();
      const result = await exportReport(prisma, redis, TENANT_ID, {
        entityType: 'ORDER',
        filters: {},
        columns: ['orderNumber', 'totalAmount'],
      }, 'csv');

      expect(result.contentType).toBe('text/csv; charset=utf-8');
      expect(result.filename).toContain('.csv');
      // Check BOM
      const csvContent = result.buffer.toString('utf-8');
      expect(csvContent.charCodeAt(0)).toBe(0xFEFF);
      // Check headers
      expect(csvContent).toContain('Order Number');
      expect(csvContent).toContain('Total Amount');
    });

    test('FR-025: CSV escapes fields with commas', async () => {
      const prisma = {
        account: {
          findMany: vi.fn().mockResolvedValue([
            { id: 'a1', name: 'Acme, Inc.', accountType: 'retail', createdAt: new Date() },
          ]),
          count: vi.fn().mockResolvedValue(1),
        },
      } as unknown as PrismaClient;

      const redis = createMockRedis();
      const result = await exportReport(prisma, redis, TENANT_ID, {
        entityType: 'ACCOUNT',
        filters: {},
        columns: ['name', 'accountType'],
      }, 'csv');

      const csvContent = result.buffer.toString('utf-8');
      // Field with comma should be quoted
      expect(csvContent).toContain('"Acme, Inc."');
    });

    test('FR-025: exports empty dataset as CSV with headers only', async () => {
      const prisma = {
        order: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
      } as unknown as PrismaClient;

      const redis = createMockRedis();
      const result = await exportReport(prisma, redis, TENANT_ID, {
        entityType: 'ORDER',
        filters: {},
        columns: ['orderNumber'],
      }, 'csv');

      const csvContent = result.buffer.toString('utf-8');
      expect(csvContent).toContain('Order Number');
      // Should have BOM + header, minimal content
      const lines = csvContent.split('\n').filter((l) => l.trim().length > 0);
      expect(lines).toHaveLength(1); // Only header row
    });

    test('FR-025: releases concurrency limit after export', async () => {
      const prisma = {
        order: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
      } as unknown as PrismaClient;

      const redis = createMockRedis();
      await exportReport(prisma, redis, TENANT_ID, {
        entityType: 'ORDER',
        filters: {},
        columns: ['orderNumber'],
      }, 'csv');

      expect(redis.decr).toHaveBeenCalled();
    });
  });
});
