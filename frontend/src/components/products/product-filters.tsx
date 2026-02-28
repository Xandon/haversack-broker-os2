'use client';

import * as React from 'react';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useBrands } from '@/hooks/use-brands';
import type { ViewMode } from './product-card';

const CATEGORIES = [
  'honey', 'condiments', 'spreads', 'sauces', 'snacks',
  'beverages', 'dairy', 'bakery', 'produce', 'meat',
  'seafood', 'pantry', 'frozen', 'other',
];

const CERTIFICATIONS = [
  'organic', 'non_gmo', 'gluten_free', 'kosher', 'vegan',
];

const AVAILABILITY_STATUSES = ['active', 'seasonal', 'discontinued'];

export interface ProductFilterValues {
  brandId: string;
  category: string;
  certification: string;
  availabilityStatus: string;
}

export interface ProductFiltersProps {
  filters: ProductFilterValues;
  onFilterChange: (filters: ProductFilterValues) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ProductFilters({
  filters,
  onFilterChange,
  viewMode,
  onViewModeChange,
}: ProductFiltersProps): React.ReactElement {
  const { data: brandsData } = useBrands({ isActive: true, limit: 100 });
  const brands = brandsData?.data ?? [];

  const handleChange = (field: keyof ProductFilterValues, value: string): void => {
    onFilterChange({ ...filters, [field]: value });
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="filter-brand" className="text-xs">Brand</Label>
        <Select
          id="filter-brand"
          value={filters.brandId}
          onChange={(e) => handleChange('brandId', e.target.value)}
        >
          <option value="">All Brands</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="filter-category" className="text-xs">Category</Label>
        <Select
          id="filter-category"
          value={filters.category}
          onChange={(e) => handleChange('category', e.target.value)}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="filter-certification" className="text-xs">Certification</Label>
        <Select
          id="filter-certification"
          value={filters.certification}
          onChange={(e) => handleChange('certification', e.target.value)}
        >
          <option value="">All Certifications</option>
          {CERTIFICATIONS.map((cert) => (
            <option key={cert} value={cert}>
              {cert.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="filter-availability" className="text-xs">Availability</Label>
        <Select
          id="filter-availability"
          value={filters.availabilityStatus}
          onChange={(e) => handleChange('availabilityStatus', e.target.value)}
        >
          <option value="">All Statuses</option>
          {AVAILABILITY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </Select>
      </div>

      <div className="ml-auto flex gap-1">
        <Button
          variant={viewMode === 'grid' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('grid')}
          aria-label="Grid view"
        >
          Grid
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('list')}
          aria-label="List view"
        >
          List
        </Button>
      </div>
    </div>
  );
}
