import { describe, test, expect } from 'vitest';
import { accountColumns } from './account-columns';

describe('FR-033b: Account column definitions', () => {
  test('FR-033b: defines correct number of columns', () => {
    expect(accountColumns).toHaveLength(5);
  });

  test('FR-033b: includes name, territory, type, healthScore, updatedAt columns', () => {
    const columnIds = accountColumns.map((col) => col.id ?? (col as { accessorKey?: string }).accessorKey);
    expect(columnIds).toContain('name');
    expect(columnIds).toContain('territory');
    expect(columnIds).toContain('accountType');
    expect(columnIds).toContain('healthScore');
    expect(columnIds).toContain('updatedAt');
  });

  test('FR-033d: name column is sortable', () => {
    const nameCol = accountColumns.find(
      (col) => col.id === 'name' || (col as { accessorKey?: string }).accessorKey === 'name',
    );
    expect(nameCol).toBeDefined();
    expect(nameCol?.enableSorting).not.toBe(false);
  });

  test('FR-033d: healthScore column is sortable', () => {
    const healthCol = accountColumns.find(
      (col) =>
        col.id === 'healthScore' || (col as { accessorKey?: string }).accessorKey === 'healthScore',
    );
    expect(healthCol).toBeDefined();
    expect(healthCol?.enableSorting).not.toBe(false);
  });

  test('FR-033d: updatedAt column is sortable', () => {
    const updatedCol = accountColumns.find(
      (col) =>
        col.id === 'updatedAt' || (col as { accessorKey?: string }).accessorKey === 'updatedAt',
    );
    expect(updatedCol).toBeDefined();
    expect(updatedCol?.enableSorting).not.toBe(false);
  });

  test('FR-033b: territory column is NOT sortable', () => {
    const territoryCol = accountColumns.find(
      (col) =>
        col.id === 'territory' || (col as { accessorKey?: string }).accessorKey === 'territory',
    );
    expect(territoryCol).toBeDefined();
    expect(territoryCol?.enableSorting).toBe(false);
  });

  test('FR-033b: accountType column is NOT sortable', () => {
    const typeCol = accountColumns.find(
      (col) =>
        col.id === 'accountType' || (col as { accessorKey?: string }).accessorKey === 'accountType',
    );
    expect(typeCol).toBeDefined();
    expect(typeCol?.enableSorting).toBe(false);
  });
});
