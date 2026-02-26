/**
 * Tests for ProductCatalogPage component.
 * Verifies FR-019 (product catalog with certification/category filtering).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ProductCatalogPage from './page';

// -------------------------------------------------------------------
// Mock hooks
// -------------------------------------------------------------------

const mockUseProductList = vi.fn();
const mockUseGenerateLineCard = vi.fn();

vi.mock('@/hooks/use-products', () => ({
  useProductList: (...args: unknown[]) => mockUseProductList(...args),
  useGenerateLineCard: () => mockUseGenerateLineCard(),
}));

// -------------------------------------------------------------------
// Fixtures
// -------------------------------------------------------------------

const MOCK_PRODUCTS = [
  {
    id: 'p1',
    name: 'Organic Wildflower Honey 12oz',
    sku: 'BEE-HON-12',
    brand: { id: 'b1', name: "Bee's Best Honey" },
    brand_id: 'b1',
    category: 'Honey',
    unit_price: 8.5,
    wholesale_price: null,
    case_size: '12 x 12oz',
    certifications: ['Organic', 'Non-GMO'],
    allergens: [],
    dietary_attributes: [],
    availability_status: 'in_stock',
    revenue_model: 'broker',
    image_url: null,
    description: null,
    promo_price: null,
    promo_active: false,
    promo_start_date: null,
    promo_end_date: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'p2',
    name: 'Artisan Hot Sauce 5oz',
    sku: 'NWS-HTS-05',
    brand: { id: 'b2', name: 'NW Spice Co' },
    brand_id: 'b2',
    category: 'Condiments',
    unit_price: 6.75,
    wholesale_price: 4.5,
    case_size: '24 x 5oz',
    certifications: ['Non-GMO'],
    allergens: ['Soybeans'],
    dietary_attributes: ['Vegan', 'Gluten-Free'],
    availability_status: 'limited',
    revenue_model: 'wholesale',
    image_url: null,
    description: 'Hand-crafted hot sauce',
    promo_price: 5.0,
    promo_active: true,
    promo_start_date: '2026-01-01T00:00:00Z',
    promo_end_date: '2026-12-31T00:00:00Z',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const DEFAULT_LINE_CARD = {
  generateLineCard: vi.fn(),
  isLoading: false,
  isError: false,
  isSuccess: false,
  error: null,
  data: undefined,
};

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe('T120: ProductCatalogPage', () => {
  it('FR-019: renders product catalog with products', () => {
    mockUseProductList.mockReturnValue({
      products: MOCK_PRODUCTS,
      pagination: { page: 1, per_page: 25, total_count: 2, total_pages: 1 },
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseGenerateLineCard.mockReturnValue(DEFAULT_LINE_CARD);

    render(<ProductCatalogPage />);

    expect(screen.getByText('Product Catalog')).toBeDefined();
    expect(screen.getByText('Organic Wildflower Honey 12oz')).toBeDefined();
    expect(screen.getByText('Artisan Hot Sauce 5oz')).toBeDefined();
  });

  it('FR-019: displays certification badges on products', () => {
    mockUseProductList.mockReturnValue({
      products: MOCK_PRODUCTS,
      pagination: { page: 1, per_page: 25, total_count: 2, total_pages: 1 },
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseGenerateLineCard.mockReturnValue(DEFAULT_LINE_CARD);

    const { container } = render(<ProductCatalogPage />);

    // Query within the table body only (avoid filter dropdowns)
    const tbody = container.querySelector('tbody')!;
    // Cert badges use text-xs within the certifications column
    const certBadges = tbody.querySelectorAll('.bg-green-100.text-green-800');
    // p1 has Organic + Non-GMO, p2 has Non-GMO = 3 cert badges + 1 In Stock badge = 4
    expect(certBadges.length).toBeGreaterThanOrEqual(3);
    expect(tbody.textContent).toContain('Organic');
    expect(tbody.textContent).toContain('Non-GMO');
  });

  it('FR-019: displays availability status badges', () => {
    mockUseProductList.mockReturnValue({
      products: MOCK_PRODUCTS,
      pagination: { page: 1, per_page: 25, total_count: 2, total_pages: 1 },
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseGenerateLineCard.mockReturnValue(DEFAULT_LINE_CARD);

    const { container } = render(<ProductCatalogPage />);

    // Query within the table body only (avoid filter dropdown options)
    const tbody = container.querySelector('tbody')!;
    // Check that In Stock and Limited text appear in the tbody
    expect(tbody.textContent).toContain('In Stock');
    expect(tbody.textContent).toContain('Limited');
  });

  it('FR-019: shows promo pricing for active promotions', () => {
    mockUseProductList.mockReturnValue({
      products: MOCK_PRODUCTS,
      pagination: { page: 1, per_page: 25, total_count: 2, total_pages: 1 },
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseGenerateLineCard.mockReturnValue(DEFAULT_LINE_CARD);

    render(<ProductCatalogPage />);

    expect(screen.getByText(/Promo: \$5\.00/)).toBeDefined();
  });

  it('FR-019: shows loading state with skeleton loaders', () => {
    mockUseProductList.mockReturnValue({
      products: [],
      pagination: null,
      isLoading: true,
      isError: false,
      error: null,
    });
    mockUseGenerateLineCard.mockReturnValue(DEFAULT_LINE_CARD);

    const { container } = render(<ProductCatalogPage />);

    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('FR-019: shows empty state when no products match filters', () => {
    mockUseProductList.mockReturnValue({
      products: [],
      pagination: null,
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseGenerateLineCard.mockReturnValue(DEFAULT_LINE_CARD);

    render(<ProductCatalogPage />);

    expect(screen.getByText('No products found')).toBeDefined();
  });

  it('FR-019: renders certification filter dropdown', () => {
    mockUseProductList.mockReturnValue({
      products: MOCK_PRODUCTS,
      pagination: { page: 1, per_page: 25, total_count: 2, total_pages: 1 },
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseGenerateLineCard.mockReturnValue(DEFAULT_LINE_CARD);

    render(<ProductCatalogPage />);

    const certFilter = screen.getByLabelText('Certification') as HTMLSelectElement;
    expect(certFilter).toBeDefined();
    expect(certFilter.tagName).toBe('SELECT');
  });

  it('FR-019: renders category filter dropdown', () => {
    mockUseProductList.mockReturnValue({
      products: MOCK_PRODUCTS,
      pagination: { page: 1, per_page: 25, total_count: 2, total_pages: 1 },
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseGenerateLineCard.mockReturnValue(DEFAULT_LINE_CARD);

    render(<ProductCatalogPage />);

    const catFilter = screen.getByLabelText('Category') as HTMLSelectElement;
    expect(catFilter).toBeDefined();
    expect(catFilter.tagName).toBe('SELECT');
  });

  it('FR-020: renders line card generation button', () => {
    mockUseProductList.mockReturnValue({
      products: MOCK_PRODUCTS,
      pagination: { page: 1, per_page: 25, total_count: 2, total_pages: 1 },
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseGenerateLineCard.mockReturnValue(DEFAULT_LINE_CARD);

    render(<ProductCatalogPage />);

    const lineCardButtons = screen.getAllByText('Line Card');
    expect(lineCardButtons.length).toBeGreaterThan(0);
  });

  it('FR-020: calls generateLineCard when Line Card button is clicked', async () => {
    const mockGenerate = vi.fn();
    mockUseProductList.mockReturnValue({
      products: MOCK_PRODUCTS,
      pagination: { page: 1, per_page: 25, total_count: 2, total_pages: 1 },
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseGenerateLineCard.mockReturnValue({
      ...DEFAULT_LINE_CARD,
      generateLineCard: mockGenerate,
    });

    render(<ProductCatalogPage />);

    const lineCardButtons = screen.getAllByText('Line Card');
    const user = userEvent.setup();
    await user.click(lineCardButtons[0]!);

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockGenerate).toHaveBeenCalledWith('b1');
  });
});
