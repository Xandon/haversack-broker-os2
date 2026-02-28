import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DuplicateWarningDialog } from './duplicate-warning-dialog';
import type { DuplicateMatch } from '@/hooks/use-check-duplicates';

const MOCK_MATCHES: DuplicateMatch[] = [
  {
    id: 'acc-1',
    name: 'Acme Food Co',
    accountType: 'retail',
    territory: { id: 'ter-1', name: 'Portland Metro' },
    confidence: 90,
    matchType: 'name',
  },
  {
    id: 'acc-2',
    name: 'Acme Foods Inc',
    accountType: 'distributor',
    territory: { id: 'ter-2', name: 'Seattle' },
    confidence: 75,
    matchType: 'name',
  },
];

describe('FR-035c: DuplicateWarningDialog', () => {
  test('FR-035c: renders duplicate matches with name and territory', () => {
    render(
      <DuplicateWarningDialog
        open={true}
        onOpenChange={vi.fn()}
        matches={MOCK_MATCHES}
        onCreateAnyway={vi.fn()}
      />,
    );

    expect(screen.getByText('Potential Duplicate Detected')).toBeDefined();
    expect(screen.getByText('Acme Food Co')).toBeDefined();
    expect(screen.getByText('Portland Metro')).toBeDefined();
    expect(screen.getByText('90% match')).toBeDefined();
    expect(screen.getByText('Acme Foods Inc')).toBeDefined();
    expect(screen.getByText('Seattle')).toBeDefined();
  });

  test('FR-035c: renders "View Existing" links for each match', () => {
    render(
      <DuplicateWarningDialog
        open={true}
        onOpenChange={vi.fn()}
        matches={MOCK_MATCHES}
        onCreateAnyway={vi.fn()}
      />,
    );

    const viewLinks = screen.getAllByText('View Existing');
    expect(viewLinks).toHaveLength(2);
  });

  test('FR-035c: calls onCreateAnyway when button clicked', async () => {
    const onCreateAnyway = vi.fn();
    const user = userEvent.setup();

    render(
      <DuplicateWarningDialog
        open={true}
        onOpenChange={vi.fn()}
        matches={MOCK_MATCHES}
        onCreateAnyway={onCreateAnyway}
      />,
    );

    await user.click(screen.getByText('Create Anyway'));
    expect(onCreateAnyway).toHaveBeenCalledOnce();
  });

  test('FR-035c: calls onOpenChange(false) when Cancel clicked', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(
      <DuplicateWarningDialog
        open={true}
        onOpenChange={onOpenChange}
        matches={MOCK_MATCHES}
        onCreateAnyway={vi.fn()}
      />,
    );

    await user.click(screen.getByText('Cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('FR-035c: does not render when closed', () => {
    render(
      <DuplicateWarningDialog
        open={false}
        onOpenChange={vi.fn()}
        matches={MOCK_MATCHES}
        onCreateAnyway={vi.fn()}
      />,
    );

    expect(screen.queryByText('Potential Duplicate Detected')).toBeNull();
  });
});
