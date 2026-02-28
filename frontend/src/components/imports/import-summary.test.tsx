import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ImportSummary } from './import-summary';

describe('ImportSummary', () => {
  it('AC-027b: displays created, updated, and skipped counts', () => {
    render(<ImportSummary result={{ created: 195, updated: 0, skipped: 5, errors: [] }} />);
    expect(screen.getByText('195')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Skipped')).toBeInTheDocument();
  });

  it('AC-027b: shows Import Complete heading', () => {
    render(<ImportSummary result={{ created: 10, updated: 0, skipped: 0, errors: [] }} />);
    expect(screen.getByText('Import Complete')).toBeInTheDocument();
  });

  it('AC-027b: displays error log when errors exist', () => {
    render(
      <ImportSummary
        result={{
          created: 10,
          updated: 0,
          skipped: 2,
          errors: [
            { row: 5, field: 'name', message: 'Name is required' },
            { row: 8, field: '', message: 'Database error while importing row' },
          ],
        }}
      />,
    );
    expect(screen.getByText(/2 errors/)).toBeInTheDocument();
    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  it('FR-027: hides error log when no errors', () => {
    render(<ImportSummary result={{ created: 10, updated: 0, skipped: 0, errors: [] }} />);
    expect(screen.queryByText(/errors/i)).not.toBeInTheDocument();
  });
});
