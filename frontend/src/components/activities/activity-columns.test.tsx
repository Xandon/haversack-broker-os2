import { describe, test, expect } from 'vitest';
import { activityColumns } from './activity-columns';

describe('FR-036: activityColumns', () => {
  test('FR-036: defines 5 columns', () => {
    expect(activityColumns).toHaveLength(5);
  });

  test('FR-036: has Type column', () => {
    const col = activityColumns.find((c) => 'accessorKey' in c && c.accessorKey === 'type');
    expect(col).toBeDefined();
    expect(col?.header).toBe('Type');
  });

  test('FR-036: has Date column', () => {
    const col = activityColumns.find((c) => 'accessorKey' in c && c.accessorKey === 'occurredAt');
    expect(col).toBeDefined();
    expect(col?.header).toBe('Date');
  });

  test('FR-036: has Notes column', () => {
    const col = activityColumns.find((c) => 'accessorKey' in c && c.accessorKey === 'notes');
    expect(col).toBeDefined();
    expect(col?.header).toBe('Notes');
  });

  test('FR-036: has Duration column', () => {
    const col = activityColumns.find((c) => 'accessorKey' in c && c.accessorKey === 'durationMinutes');
    expect(col).toBeDefined();
    expect(col?.header).toBe('Duration');
  });

  test('FR-036: has Demos column', () => {
    const col = activityColumns.find((c) => 'accessorKey' in c && c.accessorKey === 'demos');
    expect(col).toBeDefined();
    expect(col?.header).toBe('Demos');
  });
});
