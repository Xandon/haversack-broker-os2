import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processDataImport } from './data-import.job';
import type { PrismaClient } from '@prisma/client';

vi.mock('../../../backend/src/domains/admin/import.service', () => ({
  executeImport: vi.fn(),
}));

import { executeImport } from '../../../backend/src/domains/admin/import.service';

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const IMPORT_ID = '00000000-0000-4000-a000-000000000099';

function createMockPrisma(): Record<string, unknown> {
  return {
    dataImport: {
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

describe('FR-027: Data import job', () => {
  let mockPrisma: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
  });

  it('FR-027: processes import successfully', async () => {
    vi.mocked(executeImport).mockResolvedValue({
      createdRows: 10,
      updatedRows: 5,
      skippedRows: 2,
    });

    const result = await processDataImport(
      mockPrisma as unknown as PrismaClient,
      TENANT_ID,
      IMPORT_ID,
      'admin-user-id',
    );

    expect(result.status).toBe('completed');
    expect(result.createdRows).toBe(10);
    expect(result.updatedRows).toBe(5);
    expect(result.skippedRows).toBe(2);
    expect(executeImport).toHaveBeenCalledWith(
      mockPrisma,
      TENANT_ID,
      IMPORT_ID,
      expect.objectContaining({ actorId: 'admin-user-id' }),
    );
  });

  it('FR-027: handles import failure and updates status', async () => {
    vi.mocked(executeImport).mockRejectedValue(new Error('Database error'));

    const result = await processDataImport(
      mockPrisma as unknown as PrismaClient,
      TENANT_ID,
      IMPORT_ID,
      'admin-user-id',
    );

    expect(result.status).toBe('failed');
    expect(result.createdRows).toBe(0);
    const dataImport = mockPrisma['dataImport'] as { update: ReturnType<typeof vi.fn> };
    expect(dataImport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: IMPORT_ID },
        data: expect.objectContaining({ status: 'failed' }),
      }),
    );
  });

  it('FR-027: returns correct import ID in result', async () => {
    vi.mocked(executeImport).mockResolvedValue({
      createdRows: 0,
      updatedRows: 0,
      skippedRows: 0,
    });

    const result = await processDataImport(
      mockPrisma as unknown as PrismaClient,
      TENANT_ID,
      IMPORT_ID,
      'admin-user-id',
    );

    expect(result.importId).toBe(IMPORT_ID);
  });
});
