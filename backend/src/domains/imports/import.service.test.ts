import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createImportService } from './import.service';

function createMockPrisma() {
  return {
    account: {
      create: vi.fn().mockResolvedValue({ id: 'new-1' }),
    },
    product: {
      create: vi.fn().mockResolvedValue({ id: 'new-2' }),
    },
  } as unknown as Parameters<typeof createImportService>[0];
}

describe('ImportService', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let service: ReturnType<typeof createImportService>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = createImportService(prisma);
  });

  describe('getFieldDefinitions', () => {
    it('FR-027: returns field definitions for account entity', () => {
      const fields = service.getFieldDefinitions('account');
      expect(fields.length).toBeGreaterThan(0);
      expect(fields.find((f) => f.name === 'name')?.required).toBe(true);
    });

    it('FR-027: returns field definitions for product entity', () => {
      const fields = service.getFieldDefinitions('product');
      expect(fields.find((f) => f.name === 'sku')).toBeDefined();
    });
  });

  describe('validateData', () => {
    it('AC-027a: validates rows and reports valid/error counts', () => {
      const rows = [
        {
          name: 'Store A',
          accountType: 'store',
          addressLine1: '123 Main',
          city: 'Portland',
          state: 'OR',
          zipCode: '97201',
        },
        {
          name: '',
          accountType: 'store',
          addressLine1: '456 Oak',
          city: 'Seattle',
          state: 'WA',
          zipCode: '98101',
        },
        {
          name: 'Store C',
          accountType: 'invalid',
          addressLine1: '789 Pine',
          city: 'Bend',
          state: 'OR',
          zipCode: '97701',
        },
      ];

      const preview = service.validateData('account', rows);

      expect(preview.totalRows).toBe(3);
      expect(preview.validRows).toBe(1);
      expect(preview.errorRows).toBe(2);
    });

    it('AC-027a: reports specific validation errors per row', () => {
      const rows = [
        {
          name: '',
          accountType: 'store',
          addressLine1: '123 Main',
          city: 'Portland',
          state: 'OR',
          zipCode: '97201',
        },
      ];

      const preview = service.validateData('account', rows);

      expect(preview.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            row: 1,
            field: 'name',
            message: 'Name is required',
          }),
        ]),
      );
    });

    it('FR-027: validates number fields', () => {
      const rows = [
        {
          name: 'Widget',
          sku: 'W-001',
          category: 'Food',
          unitPrice: 'not-a-number',
          revenueModel: 'broker',
        },
      ];

      const preview = service.validateData('product', rows);

      expect(preview.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'unitPrice',
            message: 'Unit Price must be a number',
          }),
        ]),
      );
    });

    it('FR-027: validates enum fields with allowed values', () => {
      const rows = [
        {
          name: 'Store A',
          accountType: 'unknown_type',
          addressLine1: '123 Main',
          city: 'Portland',
          state: 'OR',
          zipCode: '97201',
        },
      ];

      const preview = service.validateData('account', rows);

      expect(preview.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'accountType',
            message: expect.stringContaining('must be one of'),
          }),
        ]),
      );
    });

    it('FR-027: detects unmapped columns', () => {
      const rows = [
        {
          name: 'Store A',
          accountType: 'store',
          addressLine1: '123 Main',
          city: 'Portland',
          state: 'OR',
          zipCode: '97201',
          unknownCol: 'value',
        },
      ];

      const preview = service.validateData('account', rows);

      expect(preview.unmappedColumns).toContain('unknownCol');
    });

    it('FR-027: all rows valid returns 0 errors', () => {
      const rows = [
        {
          name: 'Store A',
          accountType: 'store',
          addressLine1: '123 Main',
          city: 'Portland',
          state: 'OR',
          zipCode: '97201',
        },
      ];

      const preview = service.validateData('account', rows);

      expect(preview.validRows).toBe(1);
      expect(preview.errorRows).toBe(0);
      expect(preview.errors).toHaveLength(0);
    });

    it('FR-027: rejects unsupported entity type', () => {
      expect(() => service.validateData('invalid' as never, [])).toThrow('Unsupported entity type');
    });
  });

  describe('importData', () => {
    it('AC-027b: imports valid rows and skips error rows', async () => {
      const rows = [
        {
          name: 'Store A',
          accountType: 'store',
          addressLine1: '123 Main',
          city: 'Portland',
          state: 'OR',
          zipCode: '97201',
        },
        {
          name: '',
          accountType: 'store',
          addressLine1: '456 Oak',
          city: 'Seattle',
          state: 'WA',
          zipCode: '98101',
        },
      ];

      const result = await service.importData('tenant-1', 'account', rows, 'rep-1', 'territory-1');

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(prisma.account.create).toHaveBeenCalledTimes(1);
    });

    it('AC-027b: creates account records with correct data', async () => {
      const rows = [
        {
          name: 'Store A',
          accountType: 'store',
          addressLine1: '123 Main',
          city: 'Portland',
          state: 'OR',
          zipCode: '97201',
          phone: '555-1234',
          email: '',
        },
      ];

      await service.importData('tenant-1', 'account', rows, 'rep-1', 'territory-1');

      expect(prisma.account.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          name: 'Store A',
          accountType: 'store',
          city: 'Portland',
        }),
      });
    });

    it('AC-027b: imports product records', async () => {
      const rows = [
        {
          name: 'Widget',
          sku: 'W-001',
          category: 'Food',
          unitPrice: '9.99',
          revenueModel: 'broker',
        },
      ];

      const result = await service.importData(
        'tenant-1',
        'product',
        rows,
        undefined,
        undefined,
        'brand-1',
      );

      expect(result.created).toBe(1);
      expect(prisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          name: 'Widget',
          sku: 'W-001',
          unitPrice: 9.99,
        }),
      });
    });

    it('AC-027b: handles database errors gracefully', async () => {
      (prisma.account.create as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'));

      const rows = [
        {
          name: 'Store A',
          accountType: 'store',
          addressLine1: '123 Main',
          city: 'Portland',
          state: 'OR',
          zipCode: '97201',
        },
      ];

      const result = await service.importData('tenant-1', 'account', rows, 'rep-1', 'territory-1');

      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Database error');
    });
  });
});
