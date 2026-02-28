import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ProductCard } from './product-card';

import type { Product } from '@/hooks/use-products';

const mockProduct: Product = {
  id: '1',
  brandId: 'b1',
  name: 'Artisan Honey 12oz',
  sku: 'AH-12OZ',
  category: 'Condiments',
  unitPrice: 12.99,
  certifications: ['Organic', 'Non-GMO'],
  allergens: [],
  dietaryAttributes: [],
  availabilityStatus: 'in_stock',
  revenueModel: 'broker',
  isActive: true,
  brand: { id: 'b1', name: 'Bee Best' },
};

describe('ProductCard', () => {
  it('FR-018: renders product name, SKU, and brand', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Artisan Honey 12oz')).toBeInTheDocument();
    expect(screen.getByText('AH-12OZ')).toBeInTheDocument();
    expect(screen.getByText('Bee Best')).toBeInTheDocument();
  });

  it('FR-012: displays availability status with correct label', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('In Stock')).toBeInTheDocument();
  });

  it('FR-018: displays unit price', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('$12.99')).toBeInTheDocument();
  });

  it('FR-012: displays promo price when active', () => {
    const promoProduct = {
      ...mockProduct,
      promoPrice: 9.99,
      promoEndDate: new Date(Date.now() + 86400000).toISOString(),
    };
    render(<ProductCard product={promoProduct} />);

    expect(screen.getByText('$9.99')).toBeInTheDocument();
    expect(screen.getByText('$12.99')).toBeInTheDocument();
  });

  it('FR-019: displays certifications', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Organic')).toBeInTheDocument();
    expect(screen.getByText('Non-GMO')).toBeInTheDocument();
  });

  it('FR-018: calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<ProductCard product={mockProduct} onClick={onClick} />);

    await userEvent.click(screen.getByText('Artisan Honey 12oz'));
    expect(onClick).toHaveBeenCalledWith(mockProduct);
  });

  it('FR-012: shows out of stock status', () => {
    const oosProduct = { ...mockProduct, availabilityStatus: 'out_of_stock' };
    render(<ProductCard product={oosProduct} />);
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
  });
});
