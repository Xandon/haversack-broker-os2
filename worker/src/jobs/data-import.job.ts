import type { PrismaClient } from '@prisma/client';
import { executeImport } from '../../../backend/src/domains/admin/import.service';

export interface DataImportResult {
  importId: string;
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
  status: 'completed' | 'failed';
}

export async function processDataImport(
  prisma: PrismaClient,
  tenantId: string,
  importId: string,
  triggeredBy: string,
): Promise<DataImportResult> {
  try {
    const result = await executeImport(prisma, tenantId, importId, {
      actorId: triggeredBy,
      actorEmail: 'system@haversack.test',
      requestId: `import-job-${importId}`,
    });

    return {
      importId,
      createdRows: result.createdRows,
      updatedRows: result.updatedRows,
      skippedRows: result.skippedRows,
      status: 'completed',
    };
  } catch (error) {
    // Update import status to failed
    await prisma.dataImport.update({
      where: { id: importId },
      data: {
        status: 'failed',
        errorLog: {
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString(),
        },
      },
    });

    return {
      importId,
      createdRows: 0,
      updatedRows: 0,
      skippedRows: 0,
      status: 'failed',
    };
  }
}
