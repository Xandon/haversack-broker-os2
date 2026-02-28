import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createElement } from 'react';
import { TaskFilterBar } from './task-filter-bar';

describe('FR-037: TaskFilterBar', () => {
  test('FR-037: renders status filter dropdown', () => {
    const onChange = vi.fn();
    render(createElement(TaskFilterBar, { filters: {}, onFilterChange: onChange }));

    const select = screen.getByLabelText('Filter by status');
    expect(select).toBeDefined();
  });

  test('FR-037: renders priority filter dropdown', () => {
    const onChange = vi.fn();
    render(createElement(TaskFilterBar, { filters: {}, onFilterChange: onChange }));

    const select = screen.getByLabelText('Filter by priority');
    expect(select).toBeDefined();
  });

  test('FR-037: renders overdue filter dropdown', () => {
    const onChange = vi.fn();
    render(createElement(TaskFilterBar, { filters: {}, onFilterChange: onChange }));

    const select = screen.getByLabelText('Filter by overdue');
    expect(select).toBeDefined();
  });

  test('FR-037: calls onFilterChange when status is selected', () => {
    const onChange = vi.fn();
    render(createElement(TaskFilterBar, { filters: {}, onFilterChange: onChange }));

    const select = screen.getByLabelText('Filter by status');
    fireEvent.change(select, { target: { value: 'pending' } });

    expect(onChange).toHaveBeenCalledWith({ status: 'pending' });
  });

  test('FR-037: calls onFilterChange when priority is selected', () => {
    const onChange = vi.fn();
    render(createElement(TaskFilterBar, { filters: {}, onFilterChange: onChange }));

    const select = screen.getByLabelText('Filter by priority');
    fireEvent.change(select, { target: { value: 'high' } });

    expect(onChange).toHaveBeenCalledWith({ priority: 'high' });
  });

  test('FR-037: clears filter when All option is selected', () => {
    const onChange = vi.fn();
    render(createElement(TaskFilterBar, { filters: { status: 'pending' }, onFilterChange: onChange }));

    const select = screen.getByLabelText('Filter by status');
    fireEvent.change(select, { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith({ status: undefined });
  });

  test('FR-037: calls onFilterChange when overdue is toggled', () => {
    const onChange = vi.fn();
    render(createElement(TaskFilterBar, { filters: {}, onFilterChange: onChange }));

    const select = screen.getByLabelText('Filter by overdue');
    fireEvent.change(select, { target: { value: 'true' } });

    expect(onChange).toHaveBeenCalledWith({ overdue: 'true' });
  });
});
