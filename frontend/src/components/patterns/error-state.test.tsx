import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorState } from './error-state';

describe('FR-031: ErrorState composite pattern', () => {
  test('US3-AC5: renders default title and custom message', () => {
    render(<ErrorState message="Failed to load data" />);
    expect(screen.getByText('Something went wrong')).toBeDefined();
    expect(screen.getByText('Failed to load data')).toBeDefined();
  });

  test('US3-AC5: renders custom title', () => {
    render(<ErrorState title="Connection Error" message="Please check your network." />);
    expect(screen.getByText('Connection Error')).toBeDefined();
  });

  test('US3-AC5: renders retry button and calls onRetry', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Error" onRetry={onRetry} />);
    const button = screen.getByRole('button', { name: 'Try again' });
    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  test('US3-AC5: does not render retry button when onRetry is not provided', () => {
    render(<ErrorState message="Error" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('US3-AC5: renders requestId reference', () => {
    render(<ErrorState message="Error" requestId="req-123-abc" />);
    expect(screen.getByText('Reference: req-123-abc')).toBeDefined();
  });
});
