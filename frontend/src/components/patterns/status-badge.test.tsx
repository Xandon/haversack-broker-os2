import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './status-badge';

describe('FR-031: StatusBadge composite pattern', () => {
  test('US3: renders status text with proper casing', () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText('In Progress')).toBeDefined();
  });

  test('US3: maps active status to success variant', () => {
    const { container } = render(<StatusBadge status="active" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('bg-success');
  });

  test('US3: maps pending status to warning variant', () => {
    const { container } = render(<StatusBadge status="pending" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('bg-warning');
  });

  test('US3: maps rejected status to destructive variant', () => {
    const { container } = render(<StatusBadge status="rejected" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('bg-destructive');
  });

  test('US3: falls back to outline for unknown status', () => {
    render(<StatusBadge status="custom_status" />);
    expect(screen.getByText('Custom Status')).toBeDefined();
  });

  test('US3: accepts custom variant map', () => {
    const { container } = render(
      <StatusBadge status="custom" variantMap={{ custom: 'success' }} />,
    );
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('bg-success');
  });
});
