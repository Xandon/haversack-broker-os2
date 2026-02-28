import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from './empty-state';

describe('FR-031: EmptyState composite pattern', () => {
  test('US3-AC1: renders title and description', () => {
    render(<EmptyState title="No accounts" description="Create your first account to get started." />);
    expect(screen.getByText('No accounts')).toBeDefined();
    expect(screen.getByText('Create your first account to get started.')).toBeDefined();
  });

  test('US3-AC1: renders optional icon', () => {
    render(
      <EmptyState
        title="No data"
        description="Nothing here yet."
        icon={<span data-testid="custom-icon">icon</span>}
      />,
    );
    expect(screen.getByTestId('custom-icon')).toBeDefined();
  });

  test('US3-AC1: CTA button has minimum 44px touch target', () => {
    render(
      <EmptyState title="No items" description="Add one." actionLabel="Create" onAction={() => undefined} />,
    );
    const button = screen.getByRole('button', { name: 'Create' });
    expect(button).toBeDefined();
    expect(button.className).toContain('min-h-[44px]');
    expect(button.className).toContain('min-w-[44px]');
  });

  test('US3-AC1: calls onAction when CTA button is clicked', () => {
    const onAction = vi.fn();
    render(<EmptyState title="No items" description="Add one." actionLabel="Create" onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  test('US3-AC1: does not render CTA when actionLabel is not provided', () => {
    render(<EmptyState title="No items" description="Nothing here." />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
