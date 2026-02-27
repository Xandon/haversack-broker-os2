import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateFileSize,
  parseUploadedFile,
  validateImportData,
  createImportRecord,
  confirmImport,
  executeImport,
  getImportById,
  listImports,
} from './import.service';
import { getLayoutOfTruth } from './layout-of-truth.service';
import { AdminError } from './user.service';
import { createMockPrisma, type MockPrismaClient } from '../../shared/test-helpers/db';

vi.mock('../../shared/services/audit.service', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const IMPORT_ID = '00000000-0000-4000-a000-000000000099';
const USER_ID = '00000000-0000-4000-a000-000000000010';

describe('FR-027: Import service', () => {
  let mockPrisma: MockPrismaClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
  });

  describe('Layout of Truth', () => {
    it('FR-027: returns field definitions for account entity', () => {
      const layout = getLayoutOfTruth('account');
      expect(layout.entityType).toBe('account');
      expect(layout.fields.length).toBeGreaterThan(0);
      const nameField = layout.fields.find((f) => f.name === 'name');
      expect(nameField).toBeDefined();
      expect(nameField?.required).toBe(true);
    });

    it('FR-027: returns field definitions for contact entity', () => {
      const layout = getLayoutOfTruth('contact');
      expect(layout.entityType).toBe('contact');
      expect(layout.fields.find((f) => f.name === 'firstName')?.required).toBe(true);
    });

    it('FR-027: returns field definitions for product entity', () => {
      const layout = getLayoutOfTruth('product');
      expect(layout.entityType).toBe('product');
      expect(layout.fields.find((f) => f.name === 'sku')?.required).toBe(true);
    });

    it('FR-027: returns field definitions for order entity', () => {
      const layout = getLayoutOfTruth('order');
      expect(layout.entityType).toBe('order');
      expect(layout.fields.find((f) => f.name === 'accountId')?.required).toBe(true);
    });

    it('FR-027: throws for unknown entity type', () => {
      expect(() => getLayoutOfTruth('invalid')).toThrow('Unknown entity type');
    });
  });

  describe('validateFileSize', () => {
    it('FR-027: accepts files under 50 MB', () => {
      expect(() => validateFileSize(10 * 1024 * 1024)).not.toThrow();
    });

    it('FR-027: rejects files over 50 MB', () => {
      expect(() => validateFileSize(51 * 1024 * 1024)).toThrow(AdminError);
    });
  });

  describe('parseUploadedFile — CSV', () => {
    it('FR-027: parses valid CSV with headers', () => {
      const csv = 'name,accountType\nAcme Foods,retail\nBeta Corp,restaurant\n';
      const buffer = Buffer.from(csv, 'utf-8');
      const result = parseUploadedFile(buffer, 'import.csv');

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]['name']).toBe('Acme Foods');
      expect(result.rows[0]['accountType']).toBe('retail');
    });

    it('FR-027: handles UTF-8 BOM', () => {
      const bom = '\uFEFF';
      const csv = `${bom}name,accountType\nAcme,retail\n`;
      const buffer = Buffer.from(csv, 'utf-8');
      const result = parseUploadedFile(buffer, 'bom.csv');

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]['name']).toBe('Acme');
    });

    it('FR-027: rejects unsupported file format', () => {
      const buffer = Buffer.from('test data', 'utf-8');
      expect(() => parseUploadedFile(buffer, 'data.json')).toThrow(AdminError);
    });
  });

  describe('validateImportData', () => {
    it('AC-027a: validates rows and counts valid/error rows', () => {
      const rows = [
        { name: 'Acme Foods', accountType: 'retail' },
        { name: '', accountType: 'retail' }, // missing required name
        { name: 'Beta Corp', accountType: 'invalid_type' }, // bad enum
      ];

      const preview = validateImportData(rows, 'account');

      expect(preview.totalRows).toBe(3);
      expect(preview.validRows).toBe(1);
      expect(preview.errorRows).toBe(2);
      expect(preview.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('FR-027: detects unrecognized columns as warnings', () => {
      const rows = [
        { name: 'Acme', accountType: 'retail', unknownCol: 'val', anotherCol: 'x' },
      ];

      const preview = validateImportData(rows, 'account');
      expect(preview.warnings).toHaveLength(1);
      expect(preview.warnings[0]).toContain('2 columns not recognized');
    });

    it('FR-027: validates email format', () => {
      const rows = [
        { firstName: 'John', lastName: 'Doe', email: 'not-an-email', accountId: '00000000-0000-4000-a000-000000000001' },
      ];

      const preview = validateImportData(rows, 'contact');
      expect(preview.errorRows).toBe(1);
      expect(preview.errors[0]?.error).toContain('Invalid email');
    });

    it('FR-027: validates UUID format', () => {
      const rows = [
        { firstName: 'John', lastName: 'Doe', accountId: 'not-a-uuid' },
      ];

      const preview = validateImportData(rows, 'contact');
      expect(preview.errorRows).toBe(1);
      expect(preview.errors[0]?.error).toContain('Invalid UUID');
    });

    it('FR-027: validates max length', () => {
      const rows = [
        { name: 'A'.repeat(300), accountType: 'retail' },
      ];

      const preview = validateImportData(rows, 'account');
      expect(preview.errorRows).toBe(1);
      expect(preview.errors[0]?.error).toContain('maximum length');
    });

    it('FR-027: handles empty row set', () => {
      const preview = validateImportData([], 'account');
      expect(preview.totalRows).toBe(0);
      expect(preview.validRows).toBe(0);
      expect(preview.errorRows).toBe(0);
    });

    it('FR-027: passes all-valid rows', () => {
      const rows = [
        { name: 'Acme Foods', accountType: 'retail' },
        { name: 'Beta Corp', accountType: 'restaurant' },
      ];

      const preview = validateImportData(rows, 'account');
      expect(preview.totalRows).toBe(2);
      expect(preview.validRows).toBe(2);
      expect(preview.errorRows).toBe(0);
    });
  });

  describe('createImportRecord', () => {
    it('FR-027: creates import record with previewed status', async () => {
      const mockRecord = {
        id: IMPORT_ID,
        tenantId: TENANT_ID,
        status: 'previewed',
        entityType: 'account',
        filename: 'test.csv',
        totalRows: 10,
        validRows: 8,
        errorRows: 2,
      };
      mockPrisma.dataImport.create.mockResolvedValue(mockRecord);

      const result = await createImportRecord(
        mockPrisma as unknown as import('@prisma/client').PrismaClient,
        TENANT_ID,
        {
          entityType: 'account',
          filename: 'test.csv',
          fileSize: 1024,
          totalRows: 10,
          validRows: 8,
          errorRows: 2,
          errors: [],
          warnings: [],
          parsedData: [],
          createdById: USER_ID,
        },
      );

      expect(result).toHaveProperty('id', IMPORT_ID);
      expect(mockPrisma.dataImport.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('confirmImport', () => {
    it('FR-027: confirms previewed import and sets status to processing', async () => {
      mockPrisma.dataImport.findFirst.mockResolvedValue({
        id: IMPORT_ID,
        tenantId: TENANT_ID,
        status: 'previewed',
        deletedAt: null,
      });
      mockPrisma.dataImport.update.mockResolvedValue({
        id: IMPORT_ID,
        status: 'processing',
      });

      const result = await confirmImport(
        mockPrisma as unknown as import('@prisma/client').PrismaClient,
        TENANT_ID,
        IMPORT_ID,
        true,
        { actorId: USER_ID, actorEmail: 'admin@test.com' },
      );

      expect(result).toHaveProperty('id', IMPORT_ID);
      expect(mockPrisma.dataImport.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'processing' },
        }),
      );
    });

    it('FR-027: rejects confirmation of already processing import', async () => {
      mockPrisma.dataImport.findFirst.mockResolvedValue({
        id: IMPORT_ID,
        tenantId: TENANT_ID,
        status: 'processing',
        deletedAt: null,
      });

      await expect(
        confirmImport(
          mockPrisma as unknown as import('@prisma/client').PrismaClient,
          TENANT_ID,
          IMPORT_ID,
          true,
          { actorId: USER_ID, actorEmail: 'admin@test.com' },
        ),
      ).rejects.toThrow(AdminError);
    });

    it('FR-027: rejects confirmation of not-found import', async () => {
      mockPrisma.dataImport.findFirst.mockResolvedValue(null);

      await expect(
        confirmImport(
          mockPrisma as unknown as import('@prisma/client').PrismaClient,
          TENANT_ID,
          IMPORT_ID,
          true,
          { actorId: USER_ID, actorEmail: 'admin@test.com' },
        ),
      ).rejects.toThrow(AdminError);
    });
  });

  describe('executeImport', () => {
    it('AC-027b: processes valid rows and updates counts', async () => {
      mockPrisma.dataImport.findFirst.mockResolvedValue({
        id: IMPORT_ID,
        tenantId: TENANT_ID,
        status: 'processing',
        entityType: 'account',
        parsedData: [
          { name: 'Acme Foods', accountType: 'retail' },
          { name: 'Beta Corp', accountType: 'restaurant' },
        ],
      });

      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          account: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: 'new' }),
          },
        };
        return fn(tx);
      });

      mockPrisma.dataImport.update.mockResolvedValue({
        id: IMPORT_ID,
        status: 'completed',
      });

      const result = await executeImport(
        mockPrisma as unknown as import('@prisma/client').PrismaClient,
        TENANT_ID,
        IMPORT_ID,
        { actorId: USER_ID, actorEmail: 'admin@test.com' },
      );

      expect(result.createdRows).toBe(2);
      expect(result.updatedRows).toBe(0);
    });

    it('FR-027: handles import with zero valid rows', async () => {
      mockPrisma.dataImport.findFirst.mockResolvedValue({
        id: IMPORT_ID,
        tenantId: TENANT_ID,
        status: 'processing',
        entityType: 'account',
        parsedData: [],
      });

      mockPrisma.dataImport.update.mockResolvedValue({
        id: IMPORT_ID,
        status: 'completed',
      });

      const result = await executeImport(
        mockPrisma as unknown as import('@prisma/client').PrismaClient,
        TENANT_ID,
        IMPORT_ID,
        { actorId: USER_ID, actorEmail: 'admin@test.com' },
      );

      expect(result.createdRows).toBe(0);
      expect(result.updatedRows).toBe(0);
      expect(result.skippedRows).toBe(0);
    });

    it('FR-027: rejects execution of non-processing import', async () => {
      mockPrisma.dataImport.findFirst.mockResolvedValue({
        id: IMPORT_ID,
        tenantId: TENANT_ID,
        status: 'previewed',
      });

      await expect(
        executeImport(
          mockPrisma as unknown as import('@prisma/client').PrismaClient,
          TENANT_ID,
          IMPORT_ID,
          { actorId: USER_ID, actorEmail: 'admin@test.com' },
        ),
      ).rejects.toThrow(AdminError);
    });
  });

  describe('getImportById', () => {
    it('FR-027: returns import record', async () => {
      const mockRecord = { id: IMPORT_ID, tenantId: TENANT_ID, status: 'completed' };
      mockPrisma.dataImport.findFirst.mockResolvedValue(mockRecord);

      const result = await getImportById(
        mockPrisma as unknown as import('@prisma/client').PrismaClient,
        TENANT_ID,
        IMPORT_ID,
      );

      expect(result).toHaveProperty('id', IMPORT_ID);
    });

    it('FR-027: throws for nonexistent import', async () => {
      mockPrisma.dataImport.findFirst.mockResolvedValue(null);

      await expect(
        getImportById(
          mockPrisma as unknown as import('@prisma/client').PrismaClient,
          TENANT_ID,
          'nonexistent',
        ),
      ).rejects.toThrow(AdminError);
    });
  });

  describe('listImports', () => {
    it('FR-027: returns paginated import list', async () => {
      mockPrisma.dataImport.findMany.mockResolvedValue([
        { id: IMPORT_ID, status: 'completed' },
      ]);
      mockPrisma.dataImport.count.mockResolvedValue(1);

      const result = await listImports(
        mockPrisma as unknown as import('@prisma/client').PrismaClient,
        TENANT_ID,
        { page: 1, limit: 20 },
      );

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('FR-027: filters by entity type', async () => {
      mockPrisma.dataImport.findMany.mockResolvedValue([]);
      mockPrisma.dataImport.count.mockResolvedValue(0);

      await listImports(
        mockPrisma as unknown as import('@prisma/client').PrismaClient,
        TENANT_ID,
        { entityType: 'account', page: 1, limit: 20 },
      );

      expect(mockPrisma.dataImport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entityType: 'account' }),
        }),
      );
    });
  });
});
