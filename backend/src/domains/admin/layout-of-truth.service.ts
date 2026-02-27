import type { DataImportEntityType } from '@haversack/shared';
import type { LayoutOfTruthField } from '@haversack/shared';

export interface LayoutOfTruthDefinition {
  entityType: DataImportEntityType;
  fields: LayoutOfTruthField[];
}

const ACCOUNT_FIELDS: LayoutOfTruthField[] = [
  { name: 'name', type: 'string', required: true, maxLength: 255 },
  {
    name: 'accountType',
    type: 'enum',
    required: true,
    allowedValues: ['retail', 'restaurant', 'distributor'],
  },
  { name: 'territoryId', type: 'uuid', required: false },
  { name: 'phone', type: 'string', required: false, maxLength: 20 },
  { name: 'email', type: 'email', required: false, maxLength: 255 },
  { name: 'website', type: 'string', required: false, maxLength: 255 },
  { name: 'streetAddress', type: 'string', required: false, maxLength: 255 },
  { name: 'city', type: 'string', required: false, maxLength: 100 },
  { name: 'state', type: 'string', required: false, maxLength: 50 },
  { name: 'zipCode', type: 'string', required: false, maxLength: 20 },
  { name: 'notes', type: 'string', required: false },
];

const CONTACT_FIELDS: LayoutOfTruthField[] = [
  { name: 'firstName', type: 'string', required: true, maxLength: 100 },
  { name: 'lastName', type: 'string', required: true, maxLength: 100 },
  { name: 'email', type: 'email', required: false, maxLength: 255 },
  { name: 'phone', type: 'string', required: false, maxLength: 20 },
  { name: 'title', type: 'string', required: false, maxLength: 100 },
  { name: 'isPrimary', type: 'boolean', required: false },
  { name: 'accountId', type: 'uuid', required: true },
];

const PRODUCT_FIELDS: LayoutOfTruthField[] = [
  { name: 'name', type: 'string', required: true, maxLength: 255 },
  { name: 'sku', type: 'string', required: true, maxLength: 50 },
  { name: 'brandId', type: 'uuid', required: true },
  { name: 'unitPrice', type: 'number', required: true },
  { name: 'unitOfMeasure', type: 'string', required: false, maxLength: 20 },
  { name: 'description', type: 'string', required: false },
  {
    name: 'category',
    type: 'enum',
    required: false,
    allowedValues: [
      'dairy',
      'bakery',
      'produce',
      'meat',
      'seafood',
      'beverages',
      'snacks',
      'condiments',
      'frozen',
      'deli',
      'other',
    ],
  },
  { name: 'isActive', type: 'boolean', required: false },
];

const ORDER_FIELDS: LayoutOfTruthField[] = [
  { name: 'accountId', type: 'uuid', required: true },
  { name: 'orderDate', type: 'date', required: true },
  { name: 'requestedDeliveryDate', type: 'date', required: false },
  { name: 'notes', type: 'string', required: false },
  { name: 'poNumber', type: 'string', required: false, maxLength: 50 },
];

const LAYOUT_MAP: Record<string, LayoutOfTruthField[]> = {
  account: ACCOUNT_FIELDS,
  contact: CONTACT_FIELDS,
  product: PRODUCT_FIELDS,
  order: ORDER_FIELDS,
};

export function getLayoutOfTruth(entityType: string): LayoutOfTruthDefinition {
  const fields = LAYOUT_MAP[entityType];
  if (!fields) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }
  return {
    entityType: entityType as DataImportEntityType,
    fields,
  };
}
