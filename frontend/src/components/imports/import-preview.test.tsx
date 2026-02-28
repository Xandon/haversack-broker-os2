import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ImportPreview } from './import-preview';

const mockPreview = {
  totalRows: 200,
  validRows: 195,
  errorRows: 5,
  errors: [
    { row: 47, field: 'name', message: 'Name is required' },
    {
      row: 102,
      field: 'accountType',
      message: 'Type must be one of: store, restaurant, distributor, other',
    },
  ],
  unmappedColumns: ['extraCol1', 'extraCol2'],
};

describe('ImportPreview', () => {
  it('AC-027a: displays total, valid, and error row counts', () => {
    render(<ImportPreview preview={mockPreview} onImport={vi.fn()} isImporting={false} />);
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('195')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('AC-027a: displays validation errors with row and field', () => {
    render(<ImportPreview preview={mockPreview} onImport={vi.fn()} isImporting={false} />);
    expect(screen.getByText('47')).toBeInTheDocument();
    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  it('FR-027: shows unmapped column warning', () => {
    render(<ImportPreview preview={mockPreview} onImport={vi.fn()} isImporting={false} />);
    expect(screen.getByText(/2 columns not recognized/)).toBeInTheDocument();
    expect(screen.getByText(/extraCol1, extraCol2/)).toBeInTheDocument();
  });

  it('AC-027b: shows Import button with valid row count', () => {
    render(<ImportPreview preview={mockPreview} onImport={vi.fn()} isImporting={false} />);
    expect(screen.getByText('Import 195 Valid Rows')).toBeInTheDocument();
  });

  it('AC-027b: calls onImport when button clicked', () => {
    const onImport = vi.fn();
    render(<ImportPreview preview={mockPreview} onImport={onImport} isImporting={false} />);
    fireEvent.click(screen.getByText('Import 195 Valid Rows'));
    expect(onImport).toHaveBeenCalled();
  });

  it('FR-027: disables import when no valid rows', () => {
    render(
      <ImportPreview
        preview={{ ...mockPreview, validRows: 0 }}
        onImport={vi.fn()}
        isImporting={false}
      />,
    );
    expect(screen.getByText('Import 0 Valid Rows')).toBeDisabled();
  });

  it('FR-027: shows importing state', () => {
    render(<ImportPreview preview={mockPreview} onImport={vi.fn()} isImporting={true} />);
    expect(screen.getByText('Importing...')).toBeInTheDocument();
  });

  it('FR-027: hides unmapped warning when no unmapped columns', () => {
    render(
      <ImportPreview
        preview={{ ...mockPreview, unmappedColumns: [] }}
        onImport={vi.fn()}
        isImporting={false}
      />,
    );
    expect(screen.queryByText(/columns not recognized/)).not.toBeInTheDocument();
  });
});
