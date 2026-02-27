import type { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { ADMIN_ERROR_CODES } from '@haversack/shared';
import { AdminError } from './user.service';
import { getLayoutOfTruth } from './layout-of-truth.service';
import { writeAuditLog } from '../../shared/services/audit.service';

interface AuditContext {
  actorId: string;
  actorEmail: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

interface ParsedFileResult {
  rows: Record<string, string>[];
  warnings: string[];
}

interface ValidationError {
  row: number;
  field: string;
  error: string;
}

interface ImportPreview {
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: ValidationError[];
  warnings: string[];
}

interface ImportResult {
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export function validateFileSize(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new AdminError(
      'File size exceeds the 50 MB limit — please split the file into smaller batches',
      ADMIN_ERROR_CODES.IMPORT_FILE_TOO_LARGE,
    );
  }
}

export function parseUploadedFile(
  buffer: Buffer,
  filename: string,
): ParsedFileResult {
  const ext = filename.toLowerCase().split('.').pop();
  const warnings: string[] = [];

  if (ext === 'csv') {
    return parseCsvBuffer(buffer, warnings);
  } else if (ext === 'xlsx' || ext === 'xls') {
    return parseXlsxBuffer(buffer, warnings);
  } else {
    throw new AdminError(
      'Unsupported file format. Please upload a CSV or Excel file.',
      ADMIN_ERROR_CODES.IMPORT_INVALID_FORMAT,
    );
  }
}

function parseCsvBuffer(
  buffer: Buffer,
  warnings: string[],
): ParsedFileResult {
  // Handle UTF-8 BOM
  let content = buffer.toString('utf-8');
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  return { rows, warnings };
}

function parseXlsxBuffer(
  _buffer: Buffer,
  _warnings: string[],
): ParsedFileResult {
  throw new AdminError(
    'XLSX parsing requires async initialization. Use parseUploadedFileAsync instead.',
    ADMIN_ERROR_CODES.IMPORT_INVALID_FORMAT,
  );
}

export async function parseUploadedFileAsync(
  buffer: Buffer,
  filename: string,
): Promise<ParsedFileResult> {
  const ext = filename.toLowerCase().split('.').pop();
  const warnings: string[] = [];

  if (ext === 'csv') {
    return parseCsvBuffer(buffer, warnings);
  } else if (ext === 'xlsx' || ext === 'xls') {
    return parseXlsxBufferAsync(buffer, warnings);
  } else {
    throw new AdminError(
      'Unsupported file format. Please upload a CSV or Excel file.',
      ADMIN_ERROR_CODES.IMPORT_INVALID_FORMAT,
    );
  }
}

async function parseXlsxBufferAsync(
  buffer: Buffer,
  warnings: string[],
): Promise<ParsedFileResult> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheetCount = workbook.worksheets.length;
  if (sheetCount > 1) {
    warnings.push(
      `Excel file contains ${sheetCount} sheets. Only the first sheet will be imported.`,
    );
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount < 2) {
    return { rows: [], warnings };
  }

  // First row is headers
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? '').trim();
  });

  const rows: Record<string, string>[] = [];
  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    const record: Record<string, string> = {};
    let hasValues = false;

    headers.forEach((header, index) => {
      const cell = row.getCell(index + 1);
      const value = cell.value !== null && cell.value !== undefined
        ? String(cell.value).trim()
        : '';
      if (value) hasValues = true;
      record[header] = value;
    });

    if (hasValues) {
      rows.push(record);
    }
  }

  return { rows, warnings };
}

export function validateImportData(
  rows: Record<string, string>[],
  entityType: string,
): ImportPreview {
  const layout = getLayoutOfTruth(entityType);
  const knownFields = new Set(layout.fields.map((f) => f.name));
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Check for unknown columns
  if (rows.length > 0) {
    const firstRow = rows[0];
    const unknownCols = Object.keys(firstRow).filter(
      (col) => !knownFields.has(col),
    );
    if (unknownCols.length > 0) {
      warnings.push(
        `${unknownCols.length} columns not recognized: ${unknownCols.join(', ')}`,
      );
    }
  }

  // Validate each row
  let validRows = 0;
  let errorRows = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +2 for header row + 0-indexed
    let rowHasError = false;

    for (const field of layout.fields) {
      const value = row[field.name]?.trim() ?? '';

      // Required field check
      if (field.required && !value) {
        errors.push({
          row: rowNumber,
          field: field.name,
          error: `Required field is missing`,
        });
        rowHasError = true;
        continue;
      }

      if (!value) continue;

      // Type-specific validation
      if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push({
            row: rowNumber,
            field: field.name,
            error: `Invalid email format`,
          });
          rowHasError = true;
        }
      }

      if (field.type === 'uuid' && value) {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(value)) {
          errors.push({
            row: rowNumber,
            field: field.name,
            error: `Invalid UUID format`,
          });
          rowHasError = true;
        }
      }

      if (field.type === 'enum' && value && field.allowedValues) {
        if (!field.allowedValues.includes(value)) {
          errors.push({
            row: rowNumber,
            field: field.name,
            error: `Invalid value. Allowed: ${field.allowedValues.join(', ')}`,
          });
          rowHasError = true;
        }
      }

      if (field.maxLength && value.length > field.maxLength) {
        errors.push({
          row: rowNumber,
          field: field.name,
          error: `Exceeds maximum length of ${field.maxLength}`,
        });
        rowHasError = true;
      }

      if (field.type === 'number' && value) {
        if (isNaN(Number(value))) {
          errors.push({
            row: rowNumber,
            field: field.name,
            error: `Invalid number format`,
          });
          rowHasError = true;
        }
      }

      if (field.type === 'date' && value) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push({
            row: rowNumber,
            field: field.name,
            error: `Invalid date format`,
          });
          rowHasError = true;
        }
      }
    }

    if (rowHasError) {
      errorRows++;
    } else {
      validRows++;
    }
  });

  return {
    totalRows: rows.length,
    validRows,
    errorRows,
    errors,
    warnings,
  };
}

export async function createImportRecord(
  prisma: PrismaClient,
  tenantId: string,
  data: {
    entityType: string;
    filename: string;
    fileSize: number;
    totalRows: number;
    validRows: number;
    errorRows: number;
    errors: ValidationError[];
    warnings: string[];
    parsedData: Record<string, string>[];
    createdById: string;
  },
): Promise<Record<string, unknown>> {
  const record = await prisma.dataImport.create({
    data: {
      tenantId,
      createdBy: data.createdById,
      entityType: data.entityType as 'account' | 'contact' | 'product' | 'order',
      filename: data.filename,
      fileSize: data.fileSize,
      totalRows: data.totalRows,
      validRows: data.validRows,
      errorRows: data.errorRows,
      status: 'previewed',
      errorLog: data.errors as unknown as Record<string, unknown>[],
      parsedData: data.parsedData as unknown as Record<string, unknown>[],
      warnings: data.warnings,
    },
  });

  return record as unknown as Record<string, unknown>;
}

export async function confirmImport(
  prisma: PrismaClient,
  tenantId: string,
  importId: string,
  skipErrors: boolean,
  audit: AuditContext,
): Promise<Record<string, unknown>> {
  const importRecord = await prisma.dataImport.findFirst({
    where: { id: importId, tenantId, deletedAt: null },
  });

  if (!importRecord) {
    throw new AdminError('Import not found', ADMIN_ERROR_CODES.IMPORT_NOT_FOUND);
  }

  if (importRecord.status === 'processing' || importRecord.status === 'completed') {
    throw new AdminError(
      'Import is already processing or completed',
      ADMIN_ERROR_CODES.IMPORT_ALREADY_PROCESSING,
    );
  }

  if (importRecord.status !== 'previewed') {
    throw new AdminError(
      'Import is not ready for confirmation',
      ADMIN_ERROR_CODES.IMPORT_NOT_READY,
    );
  }

  // Update status to processing
  const updated = await prisma.dataImport.update({
    where: { id: importId },
    data: { status: 'processing' },
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    action: 'update',
    entityType: 'DataImport',
    entityId: importId,
    changeSummary: { oldStatus: 'previewed', newStatus: 'processing' },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return updated as unknown as Record<string, unknown>;
}

export async function executeImport(
  prisma: PrismaClient,
  tenantId: string,
  importId: string,
  audit: AuditContext,
): Promise<ImportResult> {
  const importRecord = await prisma.dataImport.findFirst({
    where: { id: importId, tenantId },
  });

  if (!importRecord) {
    throw new AdminError('Import not found', ADMIN_ERROR_CODES.IMPORT_NOT_FOUND);
  }

  if (importRecord.status !== 'processing') {
    throw new AdminError(
      'Import is not in processing state',
      ADMIN_ERROR_CODES.IMPORT_NOT_READY,
    );
  }

  const parsedData = importRecord.parsedData as unknown as Record<string, string>[];
  if (!parsedData || parsedData.length === 0) {
    await prisma.dataImport.update({
      where: { id: importId },
      data: {
        status: 'completed',
        createdRows: 0,
        updatedRows: 0,
        skippedRows: 0,
        parsedData: null,
      },
    });
    return { createdRows: 0, updatedRows: 0, skippedRows: 0 };
  }

  // Validate rows and filter valid ones
  const layout = getLayoutOfTruth(importRecord.entityType);
  const validRows: Record<string, string>[] = [];
  let skippedRows = 0;

  for (const row of parsedData) {
    let isValid = true;
    for (const field of layout.fields) {
      const value = row[field.name]?.trim() ?? '';
      if (field.required && !value) {
        isValid = false;
        break;
      }
    }
    if (isValid) {
      validRows.push(row);
    } else {
      skippedRows++;
    }
  }

  // Process in batches of 500
  const BATCH_SIZE = 500;
  let createdRows = 0;
  let updatedRows = 0;

  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);

    await prisma.$transaction(async (tx) => {
      for (const row of batch) {
        const result = await processImportRow(
          tx as PrismaClient,
          tenantId,
          importRecord.entityType,
          row,
        );
        if (result === 'created') createdRows++;
        else if (result === 'updated') updatedRows++;
        else skippedRows++;
      }
    });
  }

  // Update import record with final counts
  await prisma.dataImport.update({
    where: { id: importId },
    data: {
      status: 'completed',
      createdRows,
      updatedRows,
      skippedRows,
      parsedData: null, // Clear parsed data after processing
    },
  });

  await writeAuditLog({
    prisma,
    tenantId,
    actorId: audit.actorId,
    actorEmail: audit.actorEmail,
    action: 'update',
    entityType: 'DataImport',
    entityId: importId,
    changeSummary: { oldStatus: 'processing', newStatus: 'completed', createdRows, updatedRows, skippedRows },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    requestId: audit.requestId,
  });

  return { createdRows, updatedRows, skippedRows };
}

async function processImportRow(
  prisma: PrismaClient,
  tenantId: string,
  entityType: string,
  row: Record<string, string>,
): Promise<'created' | 'updated' | 'skipped'> {
  switch (entityType) {
    case 'account':
      return processAccountRow(prisma, tenantId, row);
    case 'contact':
      return processContactRow(prisma, tenantId, row);
    case 'product':
      return processProductRow(prisma, tenantId, row);
    default:
      return 'skipped';
  }
}

async function processAccountRow(
  prisma: PrismaClient,
  tenantId: string,
  row: Record<string, string>,
): Promise<'created' | 'updated' | 'skipped'> {
  // Try to match by name + territory
  const existing = await prisma.account.findFirst({
    where: {
      tenantId,
      name: row['name'],
      deletedAt: null,
    },
  });

  const data: Record<string, unknown> = {
    name: row['name'],
    accountType: row['accountType'] ?? 'retail',
    phone: row['phone'] || null,
    email: row['email'] || null,
    website: row['website'] || null,
    streetAddress: row['streetAddress'] || null,
    city: row['city'] || null,
    state: row['state'] || null,
    zipCode: row['zipCode'] || null,
    notes: row['notes'] || null,
  };

  if (row['territoryId']) {
    data['territoryId'] = row['territoryId'];
  }

  if (existing) {
    await prisma.account.update({
      where: { id: existing.id },
      data,
    });
    return 'updated';
  } else {
    await prisma.account.create({
      data: {
        ...data,
        tenantId,
      } as Record<string, unknown> & { tenantId: string; name: string; accountType: string },
    });
    return 'created';
  }
}

async function processContactRow(
  prisma: PrismaClient,
  tenantId: string,
  row: Record<string, string>,
): Promise<'created' | 'updated' | 'skipped'> {
  const existing = row['email']
    ? await prisma.contact.findFirst({
        where: { tenantId, email: row['email'], deletedAt: null },
      })
    : null;

  const data: Record<string, unknown> = {
    firstName: row['firstName'],
    lastName: row['lastName'],
    email: row['email'] || null,
    phone: row['phone'] || null,
    title: row['title'] || null,
    isPrimary: row['isPrimary'] === 'true',
    accountId: row['accountId'],
  };

  if (existing) {
    await prisma.contact.update({
      where: { id: existing.id },
      data,
    });
    return 'updated';
  } else {
    await prisma.contact.create({
      data: { ...data, tenantId } as Record<string, unknown> & {
        tenantId: string;
        firstName: string;
        lastName: string;
        accountId: string;
      },
    });
    return 'created';
  }
}

async function processProductRow(
  prisma: PrismaClient,
  tenantId: string,
  row: Record<string, string>,
): Promise<'created' | 'updated' | 'skipped'> {
  const existing = row['sku']
    ? await prisma.product.findFirst({
        where: { tenantId, sku: row['sku'], deletedAt: null },
      })
    : null;

  const data: Record<string, unknown> = {
    name: row['name'],
    sku: row['sku'],
    brandId: row['brandId'],
    unitPrice: parseFloat(row['unitPrice'] ?? '0'),
    unitOfMeasure: row['unitOfMeasure'] || null,
    description: row['description'] || null,
    isActive: row['isActive'] !== 'false',
  };

  if (row['category']) {
    data['category'] = row['category'];
  }

  if (existing) {
    await prisma.product.update({
      where: { id: existing.id },
      data,
    });
    return 'updated';
  } else {
    await prisma.product.create({
      data: { ...data, tenantId } as Record<string, unknown> & {
        tenantId: string;
        name: string;
        sku: string;
        brandId: string;
      },
    });
    return 'created';
  }
}

export async function getImportById(
  prisma: PrismaClient,
  tenantId: string,
  importId: string,
): Promise<Record<string, unknown>> {
  const record = await prisma.dataImport.findFirst({
    where: { id: importId, tenantId },
  });

  if (!record) {
    throw new AdminError('Import not found', ADMIN_ERROR_CODES.IMPORT_NOT_FOUND);
  }

  return record as unknown as Record<string, unknown>;
}

export async function listImports(
  prisma: PrismaClient,
  tenantId: string,
  options: { entityType?: string; page: number; limit: number },
): Promise<{
  data: Record<string, unknown>[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}> {
  const where: Record<string, unknown> = { tenantId };
  if (options.entityType) {
    where['entityType'] = options.entityType;
  }

  const [data, total] = await Promise.all([
    prisma.dataImport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    }),
    prisma.dataImport.count({ where }),
  ]);

  return {
    data: data as unknown as Record<string, unknown>[],
    meta: {
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(total / options.limit),
    },
  };
}
