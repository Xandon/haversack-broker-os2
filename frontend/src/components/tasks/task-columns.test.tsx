import { describe, test, expect } from 'vitest';
import { taskColumns } from './task-columns';

describe('FR-037: taskColumns', () => {
  test('FR-037: defines 6 columns', () => {
    expect(taskColumns).toHaveLength(6);
  });

  test('FR-037: has Title column', () => {
    const col = taskColumns.find((c) => 'accessorKey' in c && c.accessorKey === 'title');
    expect(col).toBeDefined();
    expect(col?.header).toBe('Title');
  });

  test('FR-037: has Status column', () => {
    const col = taskColumns.find((c) => 'accessorKey' in c && c.accessorKey === 'status');
    expect(col).toBeDefined();
    expect(col?.header).toBe('Status');
  });

  test('FR-037: has Priority column', () => {
    const col = taskColumns.find((c) => 'accessorKey' in c && c.accessorKey === 'priority');
    expect(col).toBeDefined();
    expect(col?.header).toBe('Priority');
  });

  test('FR-037: has Due Date column', () => {
    const col = taskColumns.find((c) => 'accessorKey' in c && c.accessorKey === 'dueDate');
    expect(col).toBeDefined();
    expect(col?.header).toBe('Due Date');
  });

  test('FR-037: has Overdue column', () => {
    const col = taskColumns.find((c) => 'accessorKey' in c && c.accessorKey === 'isOverdue');
    expect(col).toBeDefined();
    expect(col?.header).toBe('Overdue');
  });

  test('FR-037: has Description column', () => {
    const col = taskColumns.find((c) => 'accessorKey' in c && c.accessorKey === 'description');
    expect(col).toBeDefined();
    expect(col?.header).toBe('Description');
  });
});
