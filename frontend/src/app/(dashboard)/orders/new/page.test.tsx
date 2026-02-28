import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import OrderEntryPage from './page';

import { useAccounts } from '@/hooks/use-accounts';
import { useCreateOrder } from '@/hooks/use-orders';
import { useProductSearch } from '@/hooks/use-products';


vi.mock('@/hooks/use-accounts', () => ({
  useAccounts: vi.fn(),
}));

vi.mock('@/hooks/use-orders', () => ({
  useCreateOrder: vi.fn(),
}));

vi.mock('@/hooks/use-products', () => ({
  useProductSearch: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock('@/components/shared/error-banner', () => ({
  ErrorBanner: ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
    <div role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  ),
}));

const mockUseAccounts = useAccounts as ReturnType<typeof vi.fn>;
const mockUseCreateOrder = useCreateOrder as ReturnType<typeof vi.fn>;
const mockUseProductSearch = useProductSearch as ReturnType<typeof vi.fn>;

function setupDefaultMocks() {
  mockUseAccounts.mockReturnValue({
    data: { data: [{ id: 'a1', name: 'Test Account' }] },
    isLoading: false,
    error: null,
  });
  mockUseProductSearch.mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
  });
  mockUseCreateOrder.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    error: null,
    data: null,
    reset: vi.fn(),
  });
}

describe('OrderEntryPage', () => {
  it('FR-P007: renders "New Order" heading', () => {
    setupDefaultMocks();
    render(<OrderEntryPage />);

    expect(screen.getByRole('heading', { name: /new order/i })).toBeInTheDocument();
  });

  it('FR-P007: renders step 1 Account selection with account dropdown', () => {
    setupDefaultMocks();
    render(<OrderEntryPage />);

    expect(screen.getByLabelText(/select account/i)).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Test Account')).toBeInTheDocument();
  });

  it('FR-P007: renders all three step labels', () => {
    setupDefaultMocks();
    render(<OrderEntryPage />);

    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Items')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('FR-P007: shows Next button disabled when no account selected', () => {
    setupDefaultMocks();
    render(<OrderEntryPage />);

    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeDisabled();
  });

  it('FR-P007: shows error banner when create order fails', () => {
    setupDefaultMocks();
    mockUseCreateOrder.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: new Error('Create failed'),
      data: null,
      reset: vi.fn(),
    });

    render(<OrderEntryPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Unable to create order')).toBeInTheDocument();
  });

  it('FR-P007: does not show error banner when no error', () => {
    setupDefaultMocks();
    render(<OrderEntryPage />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('FR-P007: renders default "Choose an account..." placeholder option', () => {
    setupDefaultMocks();
    render(<OrderEntryPage />);

    expect(screen.getByText('Choose an account...')).toBeInTheDocument();
  });
});
