import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createElement } from 'react';
import { ActivityFilterBar } from './activity-filters';

describe('FR-036: ActivityFilterBar', () => {
  test('FR-036: renders type filter dropdown', () => {
    const onChange = vi.fn();
    render(createElement(ActivityFilterBar, { filters: {}, onFilterChange: onChange }));

    const select = screen.getByLabelText('Filter by activity type');
    expect(select).toBeDefined();
  });

  test('FR-036: shows All Types as default option', () => {
    const onChange = vi.fn();
    render(createElement(ActivityFilterBar, { filters: {}, onFilterChange: onChange }));

    expect(screen.getByText('All Types')).toBeDefined();
  });

  test('FR-036: calls onFilterChange when type is selected', () => {
    const onChange = vi.fn();
    render(createElement(ActivityFilterBar, { filters: {}, onFilterChange: onChange }));

    const select = screen.getByLabelText('Filter by activity type');
    fireEvent.change(select, { target: { value: 'visit' } });

    expect(onChange).toHaveBeenCalledWith({ type: 'visit' });
  });

  test('FR-036: clears type filter when All Types is selected', () => {
    const onChange = vi.fn();
    render(createElement(ActivityFilterBar, { filters: { type: 'visit' }, onFilterChange: onChange }));

    const select = screen.getByLabelText('Filter by activity type');
    fireEvent.change(select, { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith({ type: undefined });
  });
});
