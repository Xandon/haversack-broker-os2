import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductCard } from './product-card';
import type { ProductResponse } from '@haversack/shared';

const MOCK_PRODUCT: ProductResponse = {
  id: 'p-1',
  name: 'Artisan Wildflower Honey',
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
  description: 'Raw wildflower honey',
  imageUrl: null,
  certifications: ['organic', 'non_gmo'],
  allergens: [],
  dietaryAttributes: ['vegan'],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('FR-041: ProductCard', () => {
  test('FR-041: renders product name and brand in grid mode', () => {
    render(<ProductCard product={MOCK_PRODUCT} viewMode="grid" />);

    expect(screen.getByText('Artisan Wildflower Honey')).toBeDefined();
    expect(screen.getByText('Oregon Bee Co')).toBeDefined();
  });

  test('FR-041: renders price formatted as currency', () => {
    render(<ProductCard product={MOCK_PRODUCT} viewMode="grid" />);

    expect(screen.getByText('$12.99')).toBeDefined();
  });

  test('FR-041: renders availability badge', () => {
    render(<ProductCard product={MOCK_PRODUCT} viewMode="grid" />);

    expect(screen.getByText('active')).toBeDefined();
  });

  test('FR-041: renders certification badges', () => {
    render(<ProductCard product={MOCK_PRODUCT} viewMode="grid" />);

    expect(screen.getByText('organic')).toBeDefined();
    expect(screen.getByText('non gmo')).toBeDefined();
  });

  test('FR-041: renders SKU in grid mode', () => {
    render(<ProductCard product={MOCK_PRODUCT} viewMode="grid" />);

    expect(screen.getByText('SKU: HON-001')).toBeDefined();
  });

  test('FR-041: renders product in list mode', () => {
    render(<ProductCard product={MOCK_PRODUCT} viewMode="list" />);

    expect(screen.getByText('Artisan Wildflower Honey')).toBeDefined();
    expect(screen.getByText('$12.99')).toBeDefined();
  });

  test('FR-041: links to product detail page', () => {
    render(<ProductCard product={MOCK_PRODUCT} viewMode="grid" />);

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/products/p-1');
  });
});
