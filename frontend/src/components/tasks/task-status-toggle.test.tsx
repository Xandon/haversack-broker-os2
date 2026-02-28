import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createElement } from 'react';
import { TaskStatusToggle } from './task-status-toggle';

describe('FR-037: TaskStatusToggle', () => {
  test('FR-037: renders unchecked for pending task', () => {
    render(
      createElement(TaskStatusToggle, {
        status: 'pending',
        onToggle: vi.fn(),
      }),
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDefined();
    expect((checkbox as HTMLInputElement).checked).toBe(false);
  });

  test('FR-037: renders checked for completed task', () => {
    render(
      createElement(TaskStatusToggle, {
        status: 'completed',
        onToggle: vi.fn(),
      }),
    );

    const checkbox = screen.getByRole('checkbox');
    expect((checkbox as HTMLInputElement).checked).toBe(true);
  });

  test('FR-037: calls onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(
      createElement(TaskStatusToggle, {
        status: 'pending',
        onToggle,
      }),
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
