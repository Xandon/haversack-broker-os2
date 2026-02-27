import type { ReportEntityType, ColumnMetadata } from '@haversack/shared';

export interface ColumnDefinition extends ColumnMetadata {
  prismaField: string;
  prismaRelation?: string;
}

const ACCOUNT_COLUMNS: ColumnDefinition[] = [
  { key: 'name', label: 'Account Name', type: 'string', prismaField: 'name' },
  { key: 'accountType', label: 'Account Type', type: 'string', prismaField: 'accountType' },
  { key: 'email', label: 'Email', type: 'string', prismaField: 'email' },
  { key: 'phone', label: 'Phone', type: 'string', prismaField: 'phone' },
  { key: 'address', label: 'Address', type: 'string', prismaField: 'address' },
  { key: 'city', label: 'City', type: 'string', prismaField: 'city' },
  { key: 'state', label: 'State', type: 'string', prismaField: 'state' },
  { key: 'zipCode', label: 'Zip Code', type: 'string', prismaField: 'zipCode' },
  { key: 'territoryName', label: 'Territory', type: 'string', prismaField: 'name', prismaRelation: 'territory' },
  { key: 'createdAt', label: 'Created Date', type: 'date', prismaField: 'createdAt' },
  { key: 'updatedAt', label: 'Last Updated', type: 'date', prismaField: 'updatedAt' },
];

const ORDER_COLUMNS: ColumnDefinition[] = [
  { key: 'orderNumber', label: 'Order Number', type: 'string', prismaField: 'orderNumber' },
  { key: 'accountName', label: 'Account Name', type: 'string', prismaField: 'name', prismaRelation: 'account' },
  { key: 'total', label: 'Total', type: 'currency', prismaField: 'total' },
  { key: 'status', label: 'Status', type: 'string', prismaField: 'status' },
  { key: 'revenueModel', label: 'Revenue Model', type: 'string', prismaField: 'revenueModel' },
  { key: 'notes', label: 'Notes', type: 'string', prismaField: 'notes' },
  { key: 'createdAt', label: 'Created Date', type: 'date', prismaField: 'createdAt' },
  { key: 'updatedAt', label: 'Last Updated', type: 'date', prismaField: 'updatedAt' },
];

const PRODUCT_COLUMNS: ColumnDefinition[] = [
  { key: 'name', label: 'Product Name', type: 'string', prismaField: 'name' },
  { key: 'sku', label: 'SKU', type: 'string', prismaField: 'sku' },
  { key: 'brandName', label: 'Brand', type: 'string', prismaField: 'name', prismaRelation: 'brand' },
  { key: 'unitPrice', label: 'Unit Price', type: 'currency', prismaField: 'unitPrice' },
  { key: 'wholesalePrice', label: 'Wholesale Price', type: 'currency', prismaField: 'wholesalePrice' },
  { key: 'availabilityStatus', label: 'Availability', type: 'string', prismaField: 'availabilityStatus' },
  { key: 'isActive', label: 'Active', type: 'boolean', prismaField: 'isActive' },
  { key: 'createdAt', label: 'Created Date', type: 'date', prismaField: 'createdAt' },
];

const COMMISSION_COLUMNS: ColumnDefinition[] = [
  { key: 'repName', label: 'Rep Name', type: 'string', prismaField: 'firstName', prismaRelation: 'rep' },
  { key: 'orderNumber', label: 'Order Number', type: 'string', prismaField: 'orderNumber', prismaRelation: 'order' },
  { key: 'commissionAmount', label: 'Commission Amount', type: 'currency', prismaField: 'commissionAmount' },
  { key: 'entryType', label: 'Entry Type', type: 'string', prismaField: 'entryType' },
  { key: 'effectiveRate', label: 'Effective Rate', type: 'number', prismaField: 'effectiveRate' },
  { key: 'lineItemTotal', label: 'Line Item Total', type: 'currency', prismaField: 'lineItemTotal' },
  { key: 'calculatedAt', label: 'Calculated Date', type: 'date', prismaField: 'calculatedAt' },
];

const ACTIVITY_COLUMNS: ColumnDefinition[] = [
  { key: 'activityType', label: 'Activity Type', type: 'string', prismaField: 'activityType' },
  { key: 'subject', label: 'Subject', type: 'string', prismaField: 'subject' },
  { key: 'accountName', label: 'Account Name', type: 'string', prismaField: 'name', prismaRelation: 'account' },
  { key: 'repName', label: 'Rep Name', type: 'string', prismaField: 'firstName', prismaRelation: 'user' },
  { key: 'notes', label: 'Notes', type: 'string', prismaField: 'notes' },
  { key: 'duration', label: 'Duration (min)', type: 'number', prismaField: 'duration' },
  { key: 'createdAt', label: 'Created Date', type: 'date', prismaField: 'createdAt' },
];

const COLUMN_REGISTRY: Record<string, ColumnDefinition[]> = {
  ACCOUNT: ACCOUNT_COLUMNS,
  ORDER: ORDER_COLUMNS,
  PRODUCT: PRODUCT_COLUMNS,
  COMMISSION: COMMISSION_COLUMNS,
  ACTIVITY: ACTIVITY_COLUMNS,
};

export function getColumnsForEntity(entityType: ReportEntityType): ColumnDefinition[] {
  return COLUMN_REGISTRY[entityType] ?? [];
}

export function validateColumns(entityType: ReportEntityType, columns: string[]): string[] {
  const available = getColumnsForEntity(entityType);
  const availableKeys = new Set(available.map((c) => c.key));
  return columns.filter((c) => !availableKeys.has(c));
}

export function getColumnMetadata(entityType: ReportEntityType, columns: string[]): ColumnMetadata[] {
  const available = getColumnsForEntity(entityType);
  return columns
    .map((key) => available.find((c) => c.key === key))
    .filter((c): c is ColumnDefinition => c !== undefined)
    .map(({ key, label, type }) => ({ key, label, type }));
}

export function buildPrismaSelect(
  entityType: ReportEntityType,
  columns: string[],
): { select: Record<string, unknown>; include: Record<string, unknown> } {
  const available = getColumnsForEntity(entityType);
  const select: Record<string, boolean> = { id: true };
  const include: Record<string, Record<string, boolean>> = {};

  for (const key of columns) {
    const col = available.find((c) => c.key === key);
    if (!col) continue;

    if (col.prismaRelation) {
      if (!include[col.prismaRelation]) {
        include[col.prismaRelation] = { select: {} };
      }
      (include[col.prismaRelation]!['select'] as Record<string, boolean>)[col.prismaField] = true;
    } else {
      select[col.prismaField] = true;
    }
  }

  return { select, include };
}
