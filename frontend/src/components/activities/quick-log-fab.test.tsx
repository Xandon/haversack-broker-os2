import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createElement } from 'react';
import { QuickLogFab } from './quick-log-fab';

describe('FR-036: QuickLogFab', () => {
  test('FR-036: renders FAB button with aria-label', () => {
    const onClick = vi.fn();
    render(createElement(QuickLogFab, { onClick }));

    const button = screen.getByLabelText('Log activity');
    expect(button).toBeDefined();
  });

  test('FR-036: calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(createElement(QuickLogFab, { onClick }));

    const button = screen.getByLabelText('Log activity');
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('FR-036: has minimum 44px touch target', () => {
    const onClick = vi.fn();
    render(createElement(QuickLogFab, { onClick }));

    const button = screen.getByLabelText('Log activity');
    expect(button.className).toContain('min-h-[44px]');
    expect(button.className).toContain('min-w-[44px]');
  });
});
