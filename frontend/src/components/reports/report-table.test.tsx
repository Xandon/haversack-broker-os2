import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReportTable } from './report-table';

const mockColumns = [
  { key: 'name', label: 'Name' },
  { key: 'city', label: 'City' },
  { key: 'status', label: 'Status' },
];

const mockRows = [
  { name: 'Store A', city: 'Portland', status: 'active' },
  { name: 'Store B', city: 'Seattle', status: 'inactive' },
];

describe('ReportTable', () => {
  it('AC-025a: displays result count', () => {
    render(
      <ReportTable
        columns={mockColumns}
        rows={mockRows}
        totalCount={2}
        page={1}
        limit={50}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText('2 results')).toBeInTheDocument();
  });

  it('AC-025a: renders column headers from configuration', () => {
    render(
      <ReportTable
        columns={mockColumns}
        rows={mockRows}
        totalCount={2}
        page={1}
        limit={50}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('City')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('AC-025a: renders row data correctly', () => {
    render(
      <ReportTable
        columns={mockColumns}
        rows={mockRows}
        totalCount={2}
        page={1}
        limit={50}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Store A')).toBeInTheDocument();
    expect(screen.getByText('Portland')).toBeInTheDocument();
    expect(screen.getByText('Store B')).toBeInTheDocument();
    expect(screen.getByText('Seattle')).toBeInTheDocument();
  });

  it('FR-025: shows empty state when no results', () => {
    render(
      <ReportTable
        columns={mockColumns}
        rows={[]}
        totalCount={0}
        page={1}
        limit={50}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('FR-025: shows pagination when multiple pages', () => {
    render(
      <ReportTable
        columns={mockColumns}
        rows={mockRows}
        totalCount={100}
        page={1}
        limit={50}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('FR-025: calls onPageChange when navigating', () => {
    const onPageChange = vi.fn();
    render(
      <ReportTable
        columns={mockColumns}
        rows={mockRows}
        totalCount={100}
        page={1}
        limit={50}
        onPageChange={onPageChange}
      />,
    );
    fireEvent.click(screen.getByText('Next'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('FR-025: disables Previous on first page', () => {
    render(
      <ReportTable
        columns={mockColumns}
        rows={mockRows}
        totalCount={100}
        page={1}
        limit={50}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Previous')).toBeDisabled();
  });

  it('FR-025: formats null values as dash', () => {
    render(
      <ReportTable
        columns={[{ key: 'val', label: 'Value' }]}
        rows={[{ val: null }]}
        totalCount={1}
        page={1}
        limit={50}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('FR-025: displays singular result text for 1 result', () => {
    render(
      <ReportTable
        columns={mockColumns}
        rows={[mockRows[0]]}
        totalCount={1}
        page={1}
        limit={50}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText('1 result')).toBeInTheDocument();
  });
});
