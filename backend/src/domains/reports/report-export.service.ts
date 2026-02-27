import type { PrismaClient } from '@prisma/client';
import type { ReportEntityType, ReportExportFormat } from '@haversack/shared';
import type { ReportDefinition } from './report-executor.service';
import { executeReport } from './report-executor.service';
import { getColumnMetadata } from './column-registry';

interface RedisLike {
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
}

export async function exportReport(
  prisma: PrismaClient,
  redis: RedisLike | null,
  tenantId: string,
  reportDef: ReportDefinition,
  format: ReportExportFormat,
): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  // Execute report with export limit
  const result = await executeReport(prisma, redis, tenantId, reportDef, {
    limit: 50000,
    forExport: true,
  });

  const columns = getColumnMetadata(reportDef.entityType, reportDef.columns);
  const filename = generateExportFilename(reportDef.entityType, format);

  if (format === 'csv') {
    const buffer = generateCsvBuffer(result.data, columns);
    return { buffer, filename, contentType: 'text/csv; charset=utf-8' };
  }

  // XLSX
  const buffer = await generateXlsxBuffer(result.data, columns);
  return {
    buffer,
    filename,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

export function generateExportFilename(entityType: ReportEntityType, format: ReportExportFormat): string {
  const date = new Date().toISOString().split('T')[0]!;
  return `report-${entityType}-${date}.${format}`;
}

function generateCsvBuffer(
  data: Record<string, unknown>[],
  columns: Array<{ key: string; label: string }>,
): Buffer {
  const BOM = '\uFEFF';
  const headers = columns.map((c) => escapeCsvField(c.label)).join(',');
  const rows = data.map((row) =>
    columns.map((col) => escapeCsvField(String(row[col.key] ?? ''))).join(','),
  );

  const csv = BOM + headers + '\n' + rows.join('\n');
  return Buffer.from(csv, 'utf-8');
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

async function generateXlsxBuffer(
  data: Record<string, unknown>[],
  columns: Array<{ key: string; label: string; type: string }>,
): Promise<Buffer> {
  // Dynamic import for ExcelJS to keep it optional
  try {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // Add headers
    worksheet.columns = columns.map((col) => ({
      header: col.label,
      key: col.key,
      width: Math.max(col.label.length + 4, 15),
    }));

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.commit();

    // Add data rows
    for (const row of data) {
      const values: Record<string, unknown> = {};
      for (const col of columns) {
        values[col.key] = row[col.key] ?? '';
      }
      worksheet.addRow(values);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  } catch {
    // Fallback: return CSV as buffer if ExcelJS is not available
    return generateCsvBuffer(data, columns);
  }
}
