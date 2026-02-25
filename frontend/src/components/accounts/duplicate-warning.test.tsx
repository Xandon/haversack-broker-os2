import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DuplicateWarning } from '@/components/accounts/duplicate-warning';
import type { DuplicateMatch } from '@/hooks/use-accounts';

// -------------------------------------------------------------------
// Fixtures
// -------------------------------------------------------------------

const HIGH_CONFIDENCE_MATCH: DuplicateMatch = {
  id: 'acc-1',
  name: 'Portland Provisions',
  confidence: 95,
  matchedFields: ['name', 'address'],
};

const MEDIUM_CONFIDENCE_MATCH: DuplicateMatch = {
  id: 'acc-2',
  name: 'Portland Produce Co.',
  confidence: 75,
  matchedFields: ['name'],
};

const LOW_CONFIDENCE_MATCH: DuplicateMatch = {
  id: 'acc-3',
  name: 'Port Provisions LLC',
  confidence: 55,
  matchedFields: ['name'],
};

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe('T044: DuplicateWarning component', () => {
  it('FR-001: renders nothing when duplicates array is empty', () => {
    const { container } = render(
      <DuplicateWarning
        duplicates={[]}
        onViewExisting={vi.fn()}
        onCreateAnyway={vi.fn()}
      />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('FR-001: renders alert with role="alert" when duplicates exist', () => {
    render(
      <DuplicateWarning
        duplicates={[HIGH_CONFIDENCE_MATCH]}
        onViewExisting={vi.fn()}
        onCreateAnyway={vi.fn()}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeDefined();
  });

  it('FR-001: displays singular message for one duplicate', () => {
    render(
      <DuplicateWarning
        duplicates={[HIGH_CONFIDENCE_MATCH]}
        onViewExisting={vi.fn()}
        onCreateAnyway={vi.fn()}
      />,
    );

    expect(screen.getByText(/An existing account matches your entry/i)).toBeDefined();
  });

  it('FR-001: displays plural message for multiple duplicates', () => {
    render(
      <DuplicateWarning
        duplicates={[HIGH_CONFIDENCE_MATCH, MEDIUM_CONFIDENCE_MATCH]}
        onViewExisting={vi.fn()}
        onCreateAnyway={vi.fn()}
      />,
    );

    expect(screen.getByText(/2 existing accounts match your entry/i)).toBeDefined();
  });

  it('FR-001: shows each match name and confidence percentage', () => {
    render(
      <DuplicateWarning
        duplicates={[HIGH_CONFIDENCE_MATCH, MEDIUM_CONFIDENCE_MATCH, LOW_CONFIDENCE_MATCH]}
        onViewExisting={vi.fn()}
        onCreateAnyway={vi.fn()}
      />,
    );

    expect(screen.getByText('Portland Provisions')).toBeDefined();
    expect(screen.getByText(/95%/)).toBeDefined();
    expect(screen.getByText(/High match/)).toBeDefined();

    expect(screen.getByText('Portland Produce Co.')).toBeDefined();
    expect(screen.getByText(/75%/)).toBeDefined();
    expect(screen.getByText(/Moderate match/)).toBeDefined();

    expect(screen.getByText('Port Provisions LLC')).toBeDefined();
    expect(screen.getByText(/55%/)).toBeDefined();
    expect(screen.getByText(/Low match/)).toBeDefined();
  });

  it('FR-001: shows matched fields', () => {
    render(
      <DuplicateWarning
        duplicates={[HIGH_CONFIDENCE_MATCH]}
        onViewExisting={vi.fn()}
        onCreateAnyway={vi.fn()}
      />,
    );

    expect(screen.getByText(/Matched on: name, address/)).toBeDefined();
  });

  it('FR-001: calls onViewExisting with correct id when View Existing is clicked', async () => {
    const user = userEvent.setup();
    const onViewExisting = vi.fn();

    render(
      <DuplicateWarning
        duplicates={[HIGH_CONFIDENCE_MATCH]}
        onViewExisting={onViewExisting}
        onCreateAnyway={vi.fn()}
      />,
    );

    const viewButton = screen.getByRole('button', { name: /View existing account: Portland Provisions/i });
    await user.click(viewButton);

    expect(onViewExisting).toHaveBeenCalledWith('acc-1');
  });

  it('FR-001: calls onCreateAnyway when Create Anyway is clicked', async () => {
    const user = userEvent.setup();
    const onCreateAnyway = vi.fn();

    render(
      <DuplicateWarning
        duplicates={[HIGH_CONFIDENCE_MATCH]}
        onViewExisting={vi.fn()}
        onCreateAnyway={onCreateAnyway}
      />,
    );

    const createButton = screen.getByRole('button', { name: /Create Anyway/i });
    await user.click(createButton);

    expect(onCreateAnyway).toHaveBeenCalledOnce();
  });

  it('FR-001: renders View Existing button for each duplicate', () => {
    render(
      <DuplicateWarning
        duplicates={[HIGH_CONFIDENCE_MATCH, MEDIUM_CONFIDENCE_MATCH]}
        onViewExisting={vi.fn()}
        onCreateAnyway={vi.fn()}
      />,
    );

    const viewButtons = screen.getAllByRole('button', { name: /View existing account/i });
    expect(viewButtons).toHaveLength(2);
  });
});
