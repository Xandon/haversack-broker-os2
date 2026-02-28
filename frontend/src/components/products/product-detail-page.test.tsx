import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductDetailPage from '@/app/(authenticated)/products/[id]/page';

vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ id: 'p-1' })),
}));

vi.mock('@/hooks/use-products', () => ({
  useProduct: vi.fn(() => ({
    data: {
      data: {
        id: 'p-1',
        name: 'Artisan Wildflower Honey',
        sku: 'HON-001',
        brand: { id: 'b-1', name: 'Oregon Bee Co' },
        unitPrice: 12.99,
        wholesalePrice: 9.99,
        promotionalPrice: null,
        promotionalPriceStart: null,
        promotionalPriceEnd: null,
        caseSize: 12,
        revenueModelDefault: 'broker',
        commissionRate: 12,
        availabilityStatus: 'active',
        category: 'honey',
        subcategory: null,
        description: 'Raw wildflower honey from Oregon.',
        imageUrl: null,
        certifications: ['organic', 'non_gmo'],
        allergens: ['tree_nuts'],
        dietaryAttributes: ['vegan'],
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
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

describe('FR-041: ProductDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-041: renders product name in header', () => {
    renderWithProviders(<ProductDetailPage />);
    const elements = screen.getAllByText('Artisan Wildflower Honey');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  test('FR-041: renders pricing information', () => {
    renderWithProviders(<ProductDetailPage />);
    expect(screen.getByText('$12.99')).toBeDefined();
    expect(screen.getByText('$9.99')).toBeDefined();
  });

  test('FR-041: renders certifications', () => {
    renderWithProviders(<ProductDetailPage />);
    expect(screen.getByText('organic')).toBeDefined();
    expect(screen.getByText('non gmo')).toBeDefined();
  });

  test('FR-041: renders allergens', () => {
    renderWithProviders(<ProductDetailPage />);
    expect(screen.getByText('tree nuts')).toBeDefined();
  });

  test('FR-041: renders brand link', () => {
    renderWithProviders(<ProductDetailPage />);
    expect(screen.getByText('Oregon Bee Co')).toBeDefined();
  });

  test('FR-041: renders availability badge', () => {
    renderWithProviders(<ProductDetailPage />);
    expect(screen.getByText('active')).toBeDefined();
  });

  test('FR-041: renders commission rate', () => {
    renderWithProviders(<ProductDetailPage />);
    expect(screen.getByText('12%')).toBeDefined();
  });
});
