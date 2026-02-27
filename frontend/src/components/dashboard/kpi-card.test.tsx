import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiCard } from './kpi-card';

describe('KpiCard', () => {
  it('renders title and value', () => {
    render(<KpiCard title="Revenue" value="$10,000" />);
    expect(screen.getByText('Revenue')).toBeDefined();
    expect(screen.getByText('$10,000')).toBeDefined();
  });

  it('renders subtitle when provided', () => {
    render(<KpiCard title="Revenue" value="$10,000" subtitle="confirmed orders" />);
    expect(screen.getByText('confirmed orders')).toBeDefined();
  });

  it('renders skeleton when loading', () => {
    const { container } = render(<KpiCard title="Revenue" value="$0" isLoading />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('has region role with aria-label', () => {
    render(<KpiCard title="Revenue" value="$10,000" />);
    const region = screen.getByRole('region');
    expect(region.getAttribute('aria-label')).toBe('Revenue');
  });
});
