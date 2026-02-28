import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReportBuilder } from './report-builder';

const defaultProps = {
  onRunReport: vi.fn(),
  onExport: vi.fn(),
  isRunning: false,
  isExporting: false,
};

describe('ReportBuilder', () => {
  it('FR-025: renders entity picker with all 5 entity types', () => {
    render(<ReportBuilder {...defaultProps} />);
    expect(screen.getByText('Accounts')).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Commissions')).toBeInTheDocument();
    expect(screen.getByText('Activities')).toBeInTheDocument();
  });

  it('FR-025: shows column selector after entity type selection', () => {
    render(<ReportBuilder {...defaultProps} />);
    fireEvent.click(screen.getByText('Accounts'));
    expect(screen.getByText('Columns')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('City')).toBeInTheDocument();
  });

  it('FR-025: shows filter builder after entity type selection', () => {
    render(<ReportBuilder {...defaultProps} />);
    fireEvent.click(screen.getByText('Orders'));
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('+ Add Filter')).toBeInTheDocument();
  });

  it('FR-025: shows Run Report button after entity selection', () => {
    render(<ReportBuilder {...defaultProps} />);
    fireEvent.click(screen.getByText('Accounts'));
    expect(screen.getByText('Run Report')).toBeInTheDocument();
  });

  it('AC-025a: calls onRunReport with entity type, columns, and filters', () => {
    const onRunReport = vi.fn();
    render(<ReportBuilder {...defaultProps} onRunReport={onRunReport} />);

    fireEvent.click(screen.getByText('Accounts'));
    fireEvent.click(screen.getByText('Run Report'));

    expect(onRunReport).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'account',
        columns: expect.arrayContaining(['name', 'city', 'state']),
        filters: [],
        page: 1,
      }),
    );
  });

  it('FR-025: resets columns and filters when entity type changes', () => {
    const onRunReport = vi.fn();
    render(<ReportBuilder {...defaultProps} onRunReport={onRunReport} />);

    fireEvent.click(screen.getByText('Accounts'));
    // Add a filter
    fireEvent.click(screen.getByText('+ Add Filter'));
    expect(screen.getAllByLabelText('Filter field')).toHaveLength(1);

    // Switch entity type
    fireEvent.click(screen.getByText('Orders'));
    expect(screen.queryByLabelText('Filter value')).not.toBeInTheDocument();
  });

  it('FR-025: shows Running state when report is executing', () => {
    render(<ReportBuilder {...defaultProps} isRunning={true} />);
    fireEvent.click(screen.getByText('Accounts'));
    expect(screen.getByText('Running...')).toBeInTheDocument();
  });

  it('AC-025b: shows export buttons when report results are available', () => {
    render(
      <ReportBuilder
        {...defaultProps}
        reportResult={{
          rows: [{ id: '1', name: 'Test' }],
          totalCount: 1,
          page: 1,
          limit: 50,
        }}
      />,
    );
    fireEvent.click(screen.getByText('Accounts'));
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
    expect(screen.getByText('Export Excel')).toBeInTheDocument();
  });

  it('AC-025b: calls onExport with CSV format', () => {
    const onExport = vi.fn();
    render(
      <ReportBuilder
        {...defaultProps}
        onExport={onExport}
        reportResult={{
          rows: [{ id: '1', name: 'Test' }],
          totalCount: 1,
          page: 1,
          limit: 50,
        }}
      />,
    );
    fireEvent.click(screen.getByText('Accounts'));
    fireEvent.click(screen.getByText('Export CSV'));

    expect(onExport).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'account',
        format: 'csv',
      }),
    );
  });

  it('FR-025: heading is visible', () => {
    render(<ReportBuilder {...defaultProps} />);
    expect(screen.getByText('Report Builder')).toBeInTheDocument();
  });
});
