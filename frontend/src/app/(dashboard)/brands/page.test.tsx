import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import BrandsPage from './page';

import { useBrands } from '@/hooks/use-products';


vi.mock('@/hooks/use-products', () => ({
  useBrands: vi.fn(),
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
  Skeleton: ({ className }: { className?: string }) => (
    <div role="status" aria-label="Loading" className={className} />
  ),
}));

const mockUseBrands = useBrands as ReturnType<typeof vi.fn>;

const mockBrandsData = {
  data: [
    {
      id: 'b1',
      name: 'Local Farms',
      baseCommissionRate: 12,
      defaultRevenueModel: 'broker',
      isActive: true,
      _count: { products: 5 },
    },
  ],
};

describe('BrandsPage', () => {
  it('FR-P011: renders "Brands" heading', () => {
    mockUseBrands.mockReturnValue({
      data: mockBrandsData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<BrandsPage />);

    expect(screen.getByRole('heading', { name: /brands/i })).toBeInTheDocument();
  });

  it('FR-P011: renders search input', () => {
    mockUseBrands.mockReturnValue({
      data: mockBrandsData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<BrandsPage />);

    expect(screen.getByPlaceholderText('Search brands...')).toBeInTheDocument();
  });

  it('FR-P011: renders brand cards with name and details', () => {
    mockUseBrands.mockReturnValue({
      data: mockBrandsData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<BrandsPage />);

    expect(screen.getByText('Local Farms')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Model: broker')).toBeInTheDocument();
    expect(screen.getByText('Commission: 12%')).toBeInTheDocument();
    expect(screen.getByText('5 products')).toBeInTheDocument();
  });

  it('FR-P011: renders inactive badge for inactive brand', () => {
    mockUseBrands.mockReturnValue({
      data: {
        data: [
          {
            id: 'b2',
            name: 'Old Brand',
            baseCommissionRate: 8,
            defaultRevenueModel: 'wholesale',
            isActive: false,
            _count: { products: 0 },
          },
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<BrandsPage />);

    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('FR-P011: shows skeleton when loading', () => {
    mockUseBrands.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<BrandsPage />);

    expect(screen.getByRole('heading', { name: /brands/i })).toBeInTheDocument();
    const loadingElements = screen.getAllByRole('status', { name: /loading/i });
    expect(loadingElements.length).toBe(6);
  });

  it('FR-P011: shows error banner on error', () => {
    mockUseBrands.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
      refetch: vi.fn(),
    });

    render(<BrandsPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Unable to load brands')).toBeInTheDocument();
  });

  it('FR-P011: shows retry button on error', () => {
    mockUseBrands.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
      refetch: vi.fn(),
    });

    render(<BrandsPage />);

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('FR-P011: shows empty state when no brands', () => {
    mockUseBrands.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<BrandsPage />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No brands')).toBeInTheDocument();
    expect(screen.getByText('No brands have been added yet')).toBeInTheDocument();
  });

  it('FR-P011: shows empty state when brand data is undefined', () => {
    mockUseBrands.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<BrandsPage />);

    // When data is undefined and not loading/error, brands array becomes []
    // which triggers the empty state
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No brands')).toBeInTheDocument();
  });
});
