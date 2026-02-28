import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductCatalogPage from '@/app/(authenticated)/products/page';

vi.mock('@/hooks/use-products', () => ({
  useProducts: vi.fn(() => ({
    data: {
      data: [
        {
          id: 'p-1',
          name: 'Artisan Honey',
          sku: 'HON-001',
          brand: { id: 'b-1', name: 'Oregon Bee Co' },
          unitPrice: 12.99,
          wholesalePrice: null,
          promotionalPrice: null,
          promotionalPriceStart: null,
          promotionalPriceEnd: null,
          caseSize: null,
          revenueModelDefault: 'broker',
          commissionRate: 12,
          availabilityStatus: 'active',
          category: 'honey',
          subcategory: null,
          description: null,
          imageUrl: null,
          certifications: ['organic'],
          allergens: [],
          dietaryAttributes: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
        {
          id: 'p-2',
          name: 'Hot Sauce Deluxe',
          sku: 'SAU-002',
          brand: { id: 'b-2', name: 'PNW Sauces' },
          unitPrice: 8.49,
          wholesalePrice: null,
          promotionalPrice: null,
          promotionalPriceStart: null,
          promotionalPriceEnd: null,
          caseSize: null,
          revenueModelDefault: 'wholesale',
          commissionRate: 10,
          availabilityStatus: 'active',
          category: 'sauces',
          subcategory: null,
          description: null,
          imageUrl: null,
          certifications: [],
          allergens: [],
          dietaryAttributes: ['vegan'],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ],
      pagination: { cursor: null, hasMore: false, total: 2 },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
}));

vi.mock('@/hooks/use-brands', () => ({
  useBrands: vi.fn(() => ({
    data: {
      data: [
        { id: 'b-1', name: 'Oregon Bee Co', productCount: 5, activeProductCount: 4 },
      ],
    },
    isLoading: false,
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

describe('FR-041: ProductCatalogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-041: renders page header with title', () => {
    renderWithProviders(<ProductCatalogPage />);

    expect(screen.getByText('Products')).toBeDefined();
  });

  test('FR-041: renders product cards', () => {
    renderWithProviders(<ProductCatalogPage />);

    expect(screen.getByText('Artisan Honey')).toBeDefined();
    expect(screen.getByText('Hot Sauce Deluxe')).toBeDefined();
  });

  test('FR-041: renders filter controls', () => {
    renderWithProviders(<ProductCatalogPage />);

    expect(screen.getByLabelText(/brand/i)).toBeDefined();
    expect(screen.getByLabelText(/category/i)).toBeDefined();
  });

  test('FR-041: renders grid and list view toggles', () => {
    renderWithProviders(<ProductCatalogPage />);

    expect(screen.getByLabelText('Grid view')).toBeDefined();
    expect(screen.getByLabelText('List view')).toBeDefined();
  });

  test('FR-041: renders product prices', () => {
    renderWithProviders(<ProductCatalogPage />);

    expect(screen.getByText('$12.99')).toBeDefined();
    expect(screen.getByText('$8.49')).toBeDefined();
  });
});
