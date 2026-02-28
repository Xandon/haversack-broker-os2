'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useTerritories } from '@/hooks/use-territories';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

export interface AccountFilterValues {
  territoryId?: string;
  accountType?: string;
  healthScoreMin?: number;
  healthScoreMax?: number;
  search?: string;
}

interface AccountFiltersProps {
  onFiltersChange: (filters: AccountFilterValues) => void;
  initialValues?: AccountFilterValues;
  className?: string;
}

const HEALTH_PRESETS = [
  { label: 'All', min: undefined, max: undefined },
  { label: 'Healthy', min: 70, max: 100 },
  { label: 'Needs Attention', min: 40, max: 69 },
  { label: 'At Risk', min: 0, max: 39 },
] as const;

const ACCOUNT_TYPES = [
  { label: 'All Types', value: '' },
  { label: 'Retail', value: 'retail' },
  { label: 'Restaurant', value: 'restaurant' },
  { label: 'Distributor', value: 'distributor' },
] as const;

export function AccountFilters({
  onFiltersChange,
  initialValues = {},
  className,
}: AccountFiltersProps): React.ReactElement {
  const { data: territories } = useTerritories();
  const [searchInput, setSearchInput] = React.useState(initialValues.search ?? '');
  const [selectedTerritory, setSelectedTerritory] = React.useState(initialValues.territoryId ?? '');
  const [selectedType, setSelectedType] = React.useState(initialValues.accountType ?? '');
  const [activeHealthPreset, setActiveHealthPreset] = React.useState('All');

  const debouncedSearch = useDebounce(searchInput, 300);

  // Initialize health preset from initial values
  React.useEffect(() => {
    const preset = HEALTH_PRESETS.find(
      (p) => p.min === initialValues.healthScoreMin && p.max === initialValues.healthScoreMax,
    );
    if (preset) {
      setActiveHealthPreset(preset.label);
    }
  }, [initialValues.healthScoreMin, initialValues.healthScoreMax]);

  // Emit filter changes on debounced search
  React.useEffect(() => {
    const currentPreset = HEALTH_PRESETS.find((p) => p.label === activeHealthPreset);
    onFiltersChange({
      territoryId: selectedTerritory || undefined,
      accountType: selectedType || undefined,
      healthScoreMin: currentPreset?.min,
      healthScoreMax: currentPreset?.max,
      search: debouncedSearch.length >= 3 ? debouncedSearch : undefined,
    });
  }, [debouncedSearch, selectedTerritory, selectedType, activeHealthPreset, onFiltersChange]);

  function handleHealthPresetClick(label: string): void {
    setActiveHealthPreset(label);
  }

  function handleClearAll(): void {
    setSearchInput('');
    setSelectedTerritory('');
    setSelectedType('');
    setActiveHealthPreset('All');
    onFiltersChange({
      territoryId: undefined,
      accountType: undefined,
      healthScoreMin: undefined,
      healthScoreMax: undefined,
      search: undefined,
    });
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {/* Search */}
      <Input
        placeholder="Search accounts..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="w-64"
      />

      {/* Territory filter */}
      <Select
        value={selectedTerritory}
        onChange={(e) => setSelectedTerritory(e.target.value)}
        className="w-48"
        aria-label="Territory"
      >
        <option value="">All Territories</option>
        {territories?.map((territory) => (
          <option key={territory.id} value={territory.id}>
            {territory.name}
          </option>
        ))}
      </Select>

      {/* Account type filter */}
      <Select
        value={selectedType}
        onChange={(e) => setSelectedType(e.target.value)}
        className="w-40"
        aria-label="Type"
      >
        {ACCOUNT_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </Select>

      {/* Health score presets */}
      <div className="flex gap-1">
        {HEALTH_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            variant={activeHealthPreset === preset.label ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleHealthPresetClick(preset.label)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Clear all */}
      <Button variant="ghost" size="sm" onClick={handleClearAll}>
        Clear All
      </Button>
    </div>
  );
}
