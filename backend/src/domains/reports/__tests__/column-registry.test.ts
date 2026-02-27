import { describe, test, expect } from 'vitest';
import {
  getColumnsForEntity,
  validateColumns,
  getColumnMetadata,
  buildPrismaSelect,
} from '../column-registry';

describe('FR-025: Column registry', () => {
  describe('getColumnsForEntity', () => {
    test('FR-025: returns columns for ACCOUNT entity', () => {
      const columns = getColumnsForEntity('ACCOUNT');
      expect(columns.length).toBeGreaterThan(0);
      expect(columns.some((c) => c.key === 'name')).toBe(true);
      expect(columns.some((c) => c.key === 'accountType')).toBe(true);
    });

    test('FR-025: returns columns for ORDER entity', () => {
      const columns = getColumnsForEntity('ORDER');
      expect(columns.some((c) => c.key === 'orderNumber')).toBe(true);
      expect(columns.some((c) => c.key === 'totalAmount')).toBe(true);
      expect(columns.some((c) => c.key === 'status')).toBe(true);
    });

    test('FR-025: returns columns for PRODUCT entity', () => {
      const columns = getColumnsForEntity('PRODUCT');
      expect(columns.some((c) => c.key === 'name')).toBe(true);
      expect(columns.some((c) => c.key === 'sku')).toBe(true);
    });

    test('FR-025: returns columns for COMMISSION entity', () => {
      const columns = getColumnsForEntity('COMMISSION');
      expect(columns.some((c) => c.key === 'commissionAmount')).toBe(true);
    });

    test('FR-025: returns columns for ACTIVITY entity', () => {
      const columns = getColumnsForEntity('ACTIVITY');
      expect(columns.some((c) => c.key === 'activityType')).toBe(true);
      expect(columns.some((c) => c.key === 'subject')).toBe(true);
    });

    test('FR-025: all columns have required metadata fields', () => {
      const entityTypes = ['ACCOUNT', 'ORDER', 'PRODUCT', 'COMMISSION', 'ACTIVITY'] as const;
      for (const entityType of entityTypes) {
        const columns = getColumnsForEntity(entityType);
        for (const col of columns) {
          expect(col.key).toBeDefined();
          expect(col.label).toBeDefined();
          expect(col.type).toBeDefined();
          expect(col.prismaField).toBeDefined();
          expect(['string', 'number', 'currency', 'date', 'boolean']).toContain(col.type);
        }
      }
    });
  });

  describe('validateColumns', () => {
    test('FR-025: returns empty array for valid columns', () => {
      const invalid = validateColumns('ORDER', ['orderNumber', 'totalAmount']);
      expect(invalid).toEqual([]);
    });

    test('FR-025: returns invalid column names', () => {
      const invalid = validateColumns('ORDER', ['orderNumber', 'nonExistentField', 'badField']);
      expect(invalid).toEqual(['nonExistentField', 'badField']);
    });
  });

  describe('getColumnMetadata', () => {
    test('FR-025: returns metadata for requested columns only', () => {
      const metadata = getColumnMetadata('ORDER', ['orderNumber', 'totalAmount']);
      expect(metadata).toHaveLength(2);
      expect(metadata[0]!.key).toBe('orderNumber');
      expect(metadata[0]!.label).toBe('Order Number');
      expect(metadata[0]!.type).toBe('string');
      expect(metadata[1]!.key).toBe('totalAmount');
      expect(metadata[1]!.type).toBe('currency');
    });

    test('FR-025: skips unknown columns', () => {
      const metadata = getColumnMetadata('ORDER', ['orderNumber', 'unknown']);
      expect(metadata).toHaveLength(1);
    });
  });

  describe('buildPrismaSelect', () => {
    test('FR-025: builds select for direct fields', () => {
      const { select } = buildPrismaSelect('ORDER', ['orderNumber', 'totalAmount']);
      expect(select['id']).toBe(true);
      expect(select['orderNumber']).toBe(true);
      expect(select['totalAmount']).toBe(true);
    });

    test('FR-025: builds include for relation fields', () => {
      const { include } = buildPrismaSelect('ORDER', ['accountName']);
      expect(include['account']).toBeDefined();
    });
  });
});
