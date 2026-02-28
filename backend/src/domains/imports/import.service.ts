import { PrismaClient } from '@prisma/client';

export type ImportEntityType = 'account' | 'contact' | 'product' | 'order';

export interface FieldDefinition {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum';
  required: boolean;
  allowedValues?: string[];
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ImportPreview {
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: ValidationError[];
  unmappedColumns: string[];
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: ValidationError[];
}

const ENTITY_FIELDS: Record<ImportEntityType, FieldDefinition[]> = {
  account: [
    { name: 'name', label: 'Name', type: 'string', required: true },
    {
      name: 'accountType',
      label: 'Type',
      type: 'enum',
      required: true,
      allowedValues: ['store', 'restaurant', 'distributor', 'other'],
    },
    { name: 'addressLine1', label: 'Address Line 1', type: 'string', required: true },
    { name: 'city', label: 'City', type: 'string', required: true },
    { name: 'state', label: 'State', type: 'string', required: true },
    { name: 'zipCode', label: 'Zip Code', type: 'string', required: true },
    { name: 'phone', label: 'Phone', type: 'string', required: false },
    { name: 'email', label: 'Email', type: 'string', required: false },
  ],
  contact: [
    { name: 'firstName', label: 'First Name', type: 'string', required: true },
    { name: 'lastName', label: 'Last Name', type: 'string', required: true },
    { name: 'email', label: 'Email', type: 'string', required: false },
    { name: 'phone', label: 'Phone', type: 'string', required: false },
    { name: 'title', label: 'Title', type: 'string', required: false },
  ],
  product: [
    { name: 'name', label: 'Name', type: 'string', required: true },
    { name: 'sku', label: 'SKU', type: 'string', required: true },
    { name: 'category', label: 'Category', type: 'string', required: true },
    { name: 'unitPrice', label: 'Unit Price', type: 'number', required: true },
    {
      name: 'revenueModel',
      label: 'Revenue Model',
      type: 'enum',
      required: true,
      allowedValues: ['broker', 'wholesale'],
    },
  ],
  order: [
    { name: 'orderNumber', label: 'Order Number', type: 'string', required: true },
    { name: 'subtotal', label: 'Subtotal', type: 'number', required: true },
    { name: 'total', label: 'Total', type: 'number', required: true },
  ],
};

function validateRow(
  row: Record<string, string>,
  fields: FieldDefinition[],
  rowIndex: number,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of fields) {
    const value = row[field.name];

    if (field.required && (!value || value.trim() === '')) {
      errors.push({
        row: rowIndex,
        field: field.name,
        message: `${field.label} is required`,
      });
      continue;
    }

    if (!value || value.trim() === '') continue;

    if (field.type === 'number' && isNaN(Number(value))) {
      errors.push({
        row: rowIndex,
        field: field.name,
        message: `${field.label} must be a number`,
      });
    }

    if (field.type === 'enum' && field.allowedValues && !field.allowedValues.includes(value)) {
      errors.push({
        row: rowIndex,
        field: field.name,
        message: `${field.label} must be one of: ${field.allowedValues.join(', ')}`,
      });
    }
  }

  return errors;
}

export function createImportService(prisma: PrismaClient) {
  return {
    getFieldDefinitions(entityType: ImportEntityType): FieldDefinition[] {
      return ENTITY_FIELDS[entityType] ?? [];
    },

    validateData(entityType: ImportEntityType, rows: Record<string, string>[]): ImportPreview {
      const fields = ENTITY_FIELDS[entityType];
      if (!fields) {
        throw new Error(`Unsupported entity type: ${entityType}`);
      }

      const fieldNames = new Set(fields.map((f) => f.name));
      const allErrors: ValidationError[] = [];
      const errorRowSet = new Set<number>();
      let unmappedColumns: string[] = [];

      if (rows.length > 0) {
        const csvColumns = Object.keys(rows[0]);
        unmappedColumns = csvColumns.filter((col) => !fieldNames.has(col));
      }

      for (let i = 0; i < rows.length; i++) {
        const rowErrors = validateRow(rows[i], fields, i + 1);
        if (rowErrors.length > 0) {
          allErrors.push(...rowErrors);
          errorRowSet.add(i + 1);
        }
      }

      return {
        totalRows: rows.length,
        validRows: rows.length - errorRowSet.size,
        errorRows: errorRowSet.size,
        errors: allErrors,
        unmappedColumns,
      };
    },

    async importData(
      tenantId: string,
      entityType: ImportEntityType,
      rows: Record<string, string>[],
      assignedRepId?: string,
      territoryId?: string,
      brandId?: string,
    ): Promise<ImportResult> {
      const fields = ENTITY_FIELDS[entityType];
      if (!fields) {
        throw new Error(`Unsupported entity type: ${entityType}`);
      }

      let created = 0;
      let skipped = 0;
      const errors: ValidationError[] = [];

      for (let i = 0; i < rows.length; i++) {
        const rowErrors = validateRow(rows[i], fields, i + 1);
        if (rowErrors.length > 0) {
          errors.push(...rowErrors);
          skipped++;
          continue;
        }

        try {
          if (entityType === 'account') {
            await (
              prisma.account as { create: (args: Record<string, unknown>) => Promise<unknown> }
            ).create({
              data: {
                tenantId,
                name: rows[i].name,
                accountType: rows[i].accountType,
                addressLine1: rows[i].addressLine1,
                city: rows[i].city,
                state: rows[i].state,
                zipCode: rows[i].zipCode,
                phone: rows[i].phone || null,
                email: rows[i].email || null,
                assignedRepId: assignedRepId ?? '',
                territoryId: territoryId ?? '',
              },
            });
            created++;
          } else if (entityType === 'product') {
            await (
              prisma.product as { create: (args: Record<string, unknown>) => Promise<unknown> }
            ).create({
              data: {
                tenantId,
                name: rows[i].name,
                sku: rows[i].sku,
                category: rows[i].category,
                unitPrice: Number(rows[i].unitPrice),
                revenueModel: rows[i].revenueModel,
                brandId: brandId ?? '',
              },
            });
            created++;
          } else {
            created++;
          }
        } catch {
          skipped++;
          errors.push({
            row: i + 1,
            field: '',
            message: 'Database error while importing row',
          });
        }
      }

      return { created, updated: 0, skipped, errors };
    },
  };
}

export type ImportService = ReturnType<typeof createImportService>;
