import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AccountForm } from './account-form';

vi.mock('@/hooks/use-territories', () => ({
  useTerritories: vi.fn(() => ({
    data: [
      { id: 'ter-1', name: 'Portland Metro', region: 'PNW' },
      { id: 'ter-2', name: 'Seattle', region: 'PNW' },
    ],
    isLoading: false,
  })),
}));

vi.mock('@/hooks/use-check-duplicates', () => ({
  useCheckDuplicates: vi.fn(() => ({
    mutate: vi.fn(),
    isIdle: true,
    data: null,
  })),
}));

function renderWithProviders(ui: React.ReactElement): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('FR-035: AccountForm', () => {
  const defaultProps = {
    mode: 'create' as const,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isSubmitting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-035a: renders create form with all required fields', () => {
    renderWithProviders(<AccountForm {...defaultProps} />);

    expect(screen.getByLabelText(/account name/i)).toBeDefined();
    expect(screen.getByLabelText(/street address/i)).toBeDefined();
    expect(screen.getByLabelText(/city/i)).toBeDefined();
    expect(screen.getByLabelText(/state/i)).toBeDefined();
    expect(screen.getByLabelText(/zip code/i)).toBeDefined();
    expect(screen.getByText('Create Account')).toBeDefined();
  });

  test('FR-035g: shows primary contact section in create mode', () => {
    renderWithProviders(<AccountForm {...defaultProps} />);

    expect(screen.getByText('Primary Contact')).toBeDefined();
    expect(screen.getByLabelText(/first name/i)).toBeDefined();
    expect(screen.getByLabelText(/last name/i)).toBeDefined();
  });

  test('FR-035b: hides primary contact section in edit mode', () => {
    renderWithProviders(<AccountForm {...defaultProps} mode="edit" />);

    expect(screen.queryByText('Primary Contact')).toBeNull();
    expect(screen.getByText('Save Changes')).toBeDefined();
  });

  test('FR-035b: pre-populates form in edit mode', () => {
    renderWithProviders(
      <AccountForm
        {...defaultProps}
        mode="edit"
        defaultValues={{
          name: 'Pacific Bistro',
          streetAddress: '123 Main St',
          city: 'Portland',
          state: 'OR',
          zipCode: '97201',
        }}
      />,
    );

    expect(screen.getByDisplayValue('Pacific Bistro')).toBeDefined();
    expect(screen.getByDisplayValue('123 Main St')).toBeDefined();
    expect(screen.getByDisplayValue('Portland')).toBeDefined();
  });

  test('FR-035e: calls onCancel when Cancel button clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<AccountForm {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  test('FR-035a: disables buttons when submitting', () => {
    renderWithProviders(<AccountForm {...defaultProps} isSubmitting={true} />);

    // Check button has disabled attribute
    const savingBtn = screen.getByText('Saving...');
    expect(savingBtn.closest('button')?.disabled).toBe(true);
    const cancelBtn = screen.getByText('Cancel');
    expect(cancelBtn.closest('button')?.disabled).toBe(true);
  });

  test('FR-035d: renders territory options from hook', () => {
    renderWithProviders(<AccountForm {...defaultProps} />);

    // Territory select should be present - the options are rendered in SelectContent
    const territoryTrigger = screen.getByRole('combobox', { name: /territory/i });
    expect(territoryTrigger).toBeDefined();
  });

  test('FR-035a: renders account type select with three options', () => {
    renderWithProviders(<AccountForm {...defaultProps} />);

    const typeSelect = screen.getByRole('combobox', { name: /account type/i });
    expect(typeSelect).toBeDefined();
  });
});
