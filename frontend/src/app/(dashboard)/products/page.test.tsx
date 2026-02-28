import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ProductCatalogPage from './page';

import { useBrands, useProducts } from '@/hooks/use-products';


vi.mock('@/hooks/use-products', () => ({
  useProducts: vi.fn(),
  useBrands: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/components/products/product-card', () => ({
  ProductCard: ({ product }: { product: { id: string; name: string } }) => (
    <div data-testid={`product-card-${product.id}`}>{product.name}</div>
  ),
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
  SkeletonCard: () => <div role="status" aria-label="Loading" />,
}));

const mockUseProducts = useProducts as ReturnType<typeof vi.fn>;
const mockUseBrands = useBrands as ReturnType<typeof vi.fn>;

const mockProducts = {
  data: [
    {
      id: 'p1',
      name: 'Organic Honey',
      sku: 'HON-001',
      unitPrice: 12.5,
      brandId: 'b1',
      availabilityStatus: 'in_stock',
      brand: { name: 'Local Farms' },
    },
  ],
  total: 1,
};

const mockBrands = {
  data: [{ id: 'b1', name: 'Local Farms' }],
};

describe('ProductCatalogPage', () => {
  it('FR-P010: renders "Product Catalog" heading', () => {
    mockUseProducts.mockReturnValue({
      data: mockProducts,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseBrands.mockReturnValue({
      data: mockBrands,
      isLoading: false,
      error: null,
    });

    render(<ProductCatalogPage />);

    expect(screen.getByRole('heading', { name: /product catalog/i })).toBeInTheDocument();
  });

  it('FR-P010: renders search input and brand filter', () => {
    mockUseProducts.mockReturnValue({
      data: mockProducts,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseBrands.mockReturnValue({
      data: mockBrands,
      isLoading: false,
      error: null,
    });

    render(<ProductCatalogPage />);

    expect(screen.getByPlaceholderText('Search products...')).toBeInTheDocument();
    expect(screen.getByText('All Brands')).toBeInTheDocument();
    expect(screen.getByText('Local Farms')).toBeInTheDocument();
  });

  it('FR-P010: renders product cards with data', () => {
    mockUseProducts.mockReturnValue({
      data: mockProducts,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseBrands.mockReturnValue({
      data: mockBrands,
      isLoading: false,
      error: null,
    });

    render(<ProductCatalogPage />);

    expect(screen.getByTestId('product-card-p1')).toBeInTheDocument();
    expect(screen.getByText('Organic Honey')).toBeInTheDocument();
  });

  it('FR-P010: shows product count summary', () => {
    mockUseProducts.mockReturnValue({
      data: mockProducts,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseBrands.mockReturnValue({
      data: mockBrands,
      isLoading: false,
      error: null,
    });

    render(<ProductCatalogPage />);

    expect(screen.getByText(/showing 1 of 1 products/i)).toBeInTheDocument();
  });

  it('FR-P010: shows skeleton cards when loading', () => {
    mockUseProducts.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });
    mockUseBrands.mockReturnValue({
      data: mockBrands,
      isLoading: false,
      error: null,
    });

    render(<ProductCatalogPage />);

    const loadingElements = screen.getAllByRole('status', { name: /loading/i });
    expect(loadingElements.length).toBe(8);
  });

  it('FR-P010: shows error banner on error', () => {
    mockUseProducts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
      refetch: vi.fn(),
    });
    mockUseBrands.mockReturnValue({
      data: mockBrands,
      isLoading: false,
      error: null,
    });

    render(<ProductCatalogPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Unable to load products')).toBeInTheDocument();
  });

  it('FR-P010: shows retry button on error', () => {
    mockUseProducts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
      refetch: vi.fn(),
    });
    mockUseBrands.mockReturnValue({
      data: mockBrands,
      isLoading: false,
      error: null,
    });

    render(<ProductCatalogPage />);

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('FR-P010: shows empty state when no products', () => {
    mockUseProducts.mockReturnValue({
      data: { data: [], total: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseBrands.mockReturnValue({
      data: mockBrands,
      isLoading: false,
      error: null,
    });

    render(<ProductCatalogPage />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No products found')).toBeInTheDocument();
    expect(screen.getByText('No products in the catalog')).toBeInTheDocument();
  });

  it('FR-P010: shows empty state with null data', () => {
    mockUseProducts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseBrands.mockReturnValue({
      data: mockBrands,
      isLoading: false,
      error: null,
    });

    render(<ProductCatalogPage />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No products found')).toBeInTheDocument();
  });
});
