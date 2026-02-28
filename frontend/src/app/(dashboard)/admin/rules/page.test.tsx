import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import BusinessRulesPage from './page';

import { useBusinessRules, useToggleBusinessRule } from '@/hooks/use-business-rules';


vi.mock('@/hooks/use-business-rules', () => ({
  useBusinessRules: vi.fn(),
  useToggleBusinessRule: vi.fn(),
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

vi.mock('@/components/shared/empty-state', () => ({
  EmptyState: ({ title, description }: { title: string; description?: string }) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  ),
}));

vi.mock('@/components/shared/skeleton', () => ({
  SkeletonTable: ({ rows }: { rows?: number }) => (
    <div data-testid="skeleton-table" data-rows={rows} role="status" aria-label="Loading" />
  ),
}));

const mockUseBusinessRules = useBusinessRules as ReturnType<typeof vi.fn>;
const mockUseToggleBusinessRule = useToggleBusinessRule as ReturnType<typeof vi.fn>;

const mockRules = {
  data: [
    {
      id: 'r1',
      name: 'Auto-approve small orders',
      entityType: 'order',
      isActive: true,
      updatedAt: '2026-02-28T00:00:00Z',
    },
  ],
};

function setupDefaultMocks() {
  mockUseBusinessRules.mockReturnValue({
    data: mockRules,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  mockUseToggleBusinessRule.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    error: null,
    data: null,
    reset: vi.fn(),
  });
}

describe('BusinessRulesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FR-P017: renders "Business Rules" heading', () => {
    setupDefaultMocks();
    render(<BusinessRulesPage />);

    expect(screen.getByRole('heading', { name: /business rules/i })).toBeInTheDocument();
  });

  it('FR-P017: shows skeleton table when loading', () => {
    mockUseBusinessRules.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });
    mockUseToggleBusinessRule.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });

    render(<BusinessRulesPage />);

    expect(screen.getByTestId('skeleton-table')).toBeInTheDocument();
  });

  it('FR-P017: shows error banner on error', () => {
    mockUseBusinessRules.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load'),
      refetch: vi.fn(),
    });
    mockUseToggleBusinessRule.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });

    render(<BusinessRulesPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Unable to load rules')).toBeInTheDocument();
  });

  it('FR-P017: shows empty state when no rules', () => {
    mockUseBusinessRules.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseToggleBusinessRule.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });

    render(<BusinessRulesPage />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No business rules configured')).toBeInTheDocument();
  });

  it('FR-P017: renders rules table with rule data', () => {
    setupDefaultMocks();
    render(<BusinessRulesPage />);

    expect(screen.getByText('Auto-approve small orders')).toBeInTheDocument();
    expect(screen.getByText('order')).toBeInTheDocument();
  });

  it('FR-P017: renders toggle switches with correct aria-checked state', () => {
    setupDefaultMocks();
    render(<BusinessRulesPage />);

    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('FR-P017: renders table column headers', () => {
    setupDefaultMocks();
    render(<BusinessRulesPage />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Entity')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });

  it('FR-P017: calls toggleRule.mutate when switch is clicked', () => {
    const mockMutate = vi.fn();
    mockUseBusinessRules.mockReturnValue({
      data: mockRules,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseToggleBusinessRule.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });

    render(<BusinessRulesPage />);

    const toggle = screen.getByRole('switch');
    toggle.click();

    expect(mockMutate).toHaveBeenCalledWith({ id: 'r1', isActive: false });
  });
});
