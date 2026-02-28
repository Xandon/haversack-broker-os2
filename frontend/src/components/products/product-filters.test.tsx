import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductFilters } from './product-filters';
import type { ProductFilterValues } from './product-filters';

vi.mock('@/hooks/use-brands', () => ({
  useBrands: vi.fn(() => ({
    data: {
      data: [
        { id: 'b-1', name: 'Oregon Bee Co', productCount: 5, activeProductCount: 4 },
        { id: 'b-2', name: 'PNW Sauces', productCount: 3, activeProductCount: 3 },
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

describe('FR-041: ProductFilters', () => {
  const defaultFilters: ProductFilterValues = {
    brandId: '',
    category: '',
    certification: '',
    availabilityStatus: '',
  };

  test('FR-041: renders brand filter with options', () => {
    renderWithProviders(
      <ProductFilters
        filters={defaultFilters}
        onFilterChange={vi.fn()}
        viewMode="grid"
        onViewModeChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/brand/i)).toBeDefined();
  });

  test('FR-041: renders category, certification, and availability filters', () => {
    renderWithProviders(
      <ProductFilters
        filters={defaultFilters}
        onFilterChange={vi.fn()}
        viewMode="grid"
        onViewModeChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/category/i)).toBeDefined();
    expect(screen.getByLabelText(/certification/i)).toBeDefined();
    expect(screen.getByLabelText(/availability/i)).toBeDefined();
  });

  test('FR-041: renders grid/list view toggle buttons', () => {
    renderWithProviders(
      <ProductFilters
        filters={defaultFilters}
        onFilterChange={vi.fn()}
        viewMode="grid"
        onViewModeChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Grid view')).toBeDefined();
    expect(screen.getByLabelText('List view')).toBeDefined();
  });

  test('FR-041: calls onViewModeChange when view toggle clicked', async () => {
    const onViewModeChange = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <ProductFilters
        filters={defaultFilters}
        onFilterChange={vi.fn()}
        viewMode="grid"
        onViewModeChange={onViewModeChange}
      />,
    );

    await user.click(screen.getByLabelText('List view'));
    expect(onViewModeChange).toHaveBeenCalledWith('list');
  });

  test('FR-041: calls onFilterChange when category changed', async () => {
    const onFilterChange = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <ProductFilters
        filters={defaultFilters}
        onFilterChange={onFilterChange}
        viewMode="grid"
        onViewModeChange={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/category/i), 'honey');
    expect(onFilterChange).toHaveBeenCalledWith({ ...defaultFilters, category: 'honey' });
  });
});
