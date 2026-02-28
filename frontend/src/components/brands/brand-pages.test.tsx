import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BrandListPage from '@/app/(authenticated)/brands/page';
import BrandDetailPage from '@/app/(authenticated)/brands/[id]/page';

vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ id: 'b-1' })),
}));

vi.mock('@/hooks/use-brands', () => ({
  useBrands: vi.fn(() => ({
    data: {
      data: [
        {
          id: 'b-1',
          name: 'Oregon Bee Co',
          commissionRate: 12,
          description: 'Premium Oregon honey',
          logoUrl: null,
          contactName: 'Jane Smith',
          contactEmail: 'jane@oregonbee.com',
          contactPhone: '503-555-0123',
          website: 'https://oregonbee.com',
          isActive: true,
          productCount: 5,
          activeProductCount: 4,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
        {
          id: 'b-2',
          name: 'PNW Sauces',
          commissionRate: 10,
          description: null,
          logoUrl: null,
          contactName: null,
          contactEmail: null,
          contactPhone: null,
          website: null,
          isActive: true,
          productCount: 3,
          activeProductCount: 3,
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
  useBrand: vi.fn(() => ({
    data: {
      data: {
        id: 'b-1',
        name: 'Oregon Bee Co',
        commissionRate: 12,
        description: 'Premium Oregon honey',
        logoUrl: null,
        contactName: 'Jane Smith',
        contactEmail: 'jane@oregonbee.com',
        contactPhone: '503-555-0123',
        website: 'https://oregonbee.com',
        isActive: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
}));

vi.mock('@/hooks/use-products', () => ({
  useProducts: vi.fn(() => ({
    data: {
      data: [
        {
          id: 'p-1',
          name: 'Wildflower Honey',
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
          certifications: [],
          allergens: [],
          dietaryAttributes: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ],
      pagination: { cursor: null, hasMore: false, total: 1 },
    },
    isLoading: false,
    isError: false,
  })),
}));

vi.mock('@/hooks/use-line-card', () => ({
  useGenerateLineCard: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useShareLineCard: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
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

describe('FR-041: BrandListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-041: renders page header', () => {
    renderWithProviders(<BrandListPage />);
    expect(screen.getByText('Brands')).toBeDefined();
  });

  test('FR-041: renders brand names', () => {
    renderWithProviders(<BrandListPage />);
    expect(screen.getByText('Oregon Bee Co')).toBeDefined();
    expect(screen.getByText('PNW Sauces')).toBeDefined();
  });

  test('FR-041: renders product counts', () => {
    renderWithProviders(<BrandListPage />);
    expect(screen.getByText('4 active products')).toBeDefined();
    expect(screen.getByText('3 active products')).toBeDefined();
  });

  test('FR-041: renders commission rates', () => {
    renderWithProviders(<BrandListPage />);
    expect(screen.getByText('12% commission')).toBeDefined();
    expect(screen.getByText('10% commission')).toBeDefined();
  });
});

describe('FR-041: BrandDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-041: renders brand name in header', () => {
    renderWithProviders(<BrandDetailPage />);
    const elements = screen.getAllByText('Oregon Bee Co');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  test('FR-041: renders brand contact info', () => {
    renderWithProviders(<BrandDetailPage />);
    expect(screen.getByText('Jane Smith')).toBeDefined();
    expect(screen.getByText('jane@oregonbee.com')).toBeDefined();
  });

  test('FR-041: renders download line card button', () => {
    renderWithProviders(<BrandDetailPage />);
    expect(screen.getByText('Download Line Card')).toBeDefined();
  });

  test('FR-041: renders brand products list', () => {
    renderWithProviders(<BrandDetailPage />);
    expect(screen.getByText('Wildflower Honey')).toBeDefined();
  });

  test('FR-041: renders commission rate', () => {
    renderWithProviders(<BrandDetailPage />);
    expect(screen.getByText('12% commission rate')).toBeDefined();
  });
});
