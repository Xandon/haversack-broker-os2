import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PeriodSelector } from './period-selector';

describe('PeriodSelector', () => {
  it('renders select with aria-label', () => {
    render(<PeriodSelector value="current_month" onChange={vi.fn()} />);
    const select = screen.getByRole('combobox', { name: 'Select dashboard period' });
    expect(select).toBeDefined();
  });

  it('renders all period options', () => {
    render(<PeriodSelector value="current_month" onChange={vi.fn()} />);
    expect(screen.getByText('This Month')).toBeDefined();
    expect(screen.getByText('Last Month')).toBeDefined();
    expect(screen.getByText('This Quarter')).toBeDefined();
    expect(screen.getByText('Year to Date')).toBeDefined();
    expect(screen.getByText('Trailing 12 Months')).toBeDefined();
  });

  it('calls onChange when selection changes', async () => {
    const onChange = vi.fn();
    render(<PeriodSelector value="current_month" onChange={onChange} />);
    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, 'ytd');
    expect(onChange).toHaveBeenCalledWith('ytd');
  });
});
