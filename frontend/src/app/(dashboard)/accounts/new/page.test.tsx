import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import NewAccountPage from './page';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockMutate = vi.fn();
const mockReset = vi.fn();
const mockCreateAccount = {
  mutate: mockMutate,
  isPending: false,
  error: null as Error | null,
  reset: mockReset,
};

vi.mock('@/hooks/use-accounts', () => ({
  useCreateAccount: () => mockCreateAccount,
}));

vi.mock('@/components/accounts/account-form', () => ({
  AccountForm: ({
    onSubmit,
    isLoading,
  }: {
    onSubmit: (data: Record<string, unknown>) => void;
    isLoading?: boolean;
  }) => (
    <form
      data-testid="account-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name: 'Test Account' });
      }}
    >
      <span data-testid="form-loading">{String(isLoading)}</span>
      <button type="submit">Save Account</button>
    </form>
  ),
}));

describe('NewAccountPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAccount.error = null;
    mockCreateAccount.isPending = false;
  });

  it('FR-P005: renders "Create Account" heading', () => {
    render(<NewAccountPage />);

    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
  });

  it('FR-P005: renders the account form', () => {
    render(<NewAccountPage />);

    expect(screen.getByTestId('account-form')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save account/i })).toBeInTheDocument();
  });

  it('FR-P005: passes isPending to form isLoading prop', () => {
    mockCreateAccount.isPending = true;

    render(<NewAccountPage />);

    expect(screen.getByTestId('form-loading')).toHaveTextContent('true');
  });

  it('FR-P005: calls mutate when form is submitted', async () => {
    render(<NewAccountPage />);

    screen.getByRole('button', { name: /save account/i }).click();

    expect(mockMutate).toHaveBeenCalledWith(
      { name: 'Test Account' },
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );
  });

  it('FR-P005: redirects to account detail page on success', () => {
    render(<NewAccountPage />);

    screen.getByRole('button', { name: /save account/i }).click();

    // Extract the onSuccess callback and invoke it
    const callArgs = mockMutate.mock.calls[0];
    const options = callArgs[1] as { onSuccess: (result: { data: { id: string } }) => void };
    options.onSuccess({ data: { id: 'new-account-123' } });

    expect(mockPush).toHaveBeenCalledWith('/accounts/new-account-123');
  });

  it('FR-P005: shows error banner when mutation fails', () => {
    mockCreateAccount.error = new Error('Validation failed');

    render(<NewAccountPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Unable to create account')).toBeInTheDocument();
  });

  it('FR-P005: error banner retry button calls reset', () => {
    mockCreateAccount.error = new Error('fail');

    render(<NewAccountPage />);

    screen.getByText('Retry').click();
    expect(mockReset).toHaveBeenCalled();
  });

  it('FR-P005: does not show error banner when no error exists', () => {
    mockCreateAccount.error = null;

    render(<NewAccountPage />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
