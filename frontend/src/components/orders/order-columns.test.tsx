import { describe, test, expect } from 'vitest';
import { orderColumns } from './order-columns';

describe('FR-011: Order columns', () => {
  test('FR-011: defines expected columns', () => {
    const headers = orderColumns.map((col) => ('header' in col ? col.header : ''));
    expect(headers).toContain('Order #');
    expect(headers).toContain('Account');
    expect(headers).toContain('Status');
    expect(headers).toContain('Total');
    expect(headers).toContain('Items');
    expect(headers).toContain('Rep');
    expect(headers).toContain('Created');
  });

  test('FR-011: order number column is sortable', () => {
    const orderNumberCol = orderColumns.find(
      (col) => 'accessorKey' in col && col.accessorKey === 'orderNumber',
    );
    expect(orderNumberCol).toBeDefined();
    expect(orderNumberCol?.enableSorting).toBe(true);
  });

  test('FR-011: total column is sortable', () => {
    const totalCol = orderColumns.find(
      (col) => 'accessorKey' in col && col.accessorKey === 'total',
    );
    expect(totalCol).toBeDefined();
    expect(totalCol?.enableSorting).toBe(true);
  });

  test('FR-011: createdAt column is sortable', () => {
    const createdAtCol = orderColumns.find(
      (col) => 'accessorKey' in col && col.accessorKey === 'createdAt',
    );
    expect(createdAtCol).toBeDefined();
    expect(createdAtCol?.enableSorting).toBe(true);
  });

  test('FR-011: status column is not sortable', () => {
    const statusCol = orderColumns.find(
      (col) => 'accessorKey' in col && col.accessorKey === 'status',
    );
    expect(statusCol).toBeDefined();
    expect(statusCol?.enableSorting).toBe(false);
  });

  test('FR-011: has 7 columns total', () => {
    expect(orderColumns).toHaveLength(7);
  });
});
