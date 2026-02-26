import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TaskForm } from '@/components/forms/task-form';

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe('T077: TaskForm component', () => {
  it('FR-009: renders all required fields', () => {
    render(<TaskForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/Title/i)).toBeDefined();
    expect(screen.getByLabelText(/Due date/i)).toBeDefined();
    expect(screen.getByLabelText(/Priority/i)).toBeDefined();
    expect(screen.getByLabelText(/Assigned to/i)).toBeDefined();
  });

  it('FR-009: renders optional description field', () => {
    render(<TaskForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/Description/i)).toBeDefined();
  });

  it('FR-009: shows validation errors when submitting empty form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TaskForm onSubmit={onSubmit} />);

    const submitButton = screen.getByRole('button', { name: /Create Task/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeDefined();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('FR-009: calls onSubmit with form values when all required fields are filled', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TaskForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/Title/i), 'Follow up with Portland Provisions');
    await user.type(screen.getByLabelText(/Due date/i), '2026-03-15');
    await user.selectOptions(screen.getByLabelText(/Priority/i), 'high');
    await user.type(screen.getByLabelText(/Assigned to/i), 'user-1');

    const submitButton = screen.getByRole('button', { name: /Create Task/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Follow up with Portland Provisions',
        dueDate: '2026-03-15',
        priority: 'high',
        assignedTo: 'user-1',
      }),
      expect.anything(),
    );
  });

  it('FR-009: has priority options for high, medium, low', () => {
    render(<TaskForm onSubmit={vi.fn()} />);

    const select = screen.getByLabelText(/Priority/i) as HTMLSelectElement;
    const options = Array.from(select.options).map((opt) => opt.value);

    expect(options).toContain('high');
    expect(options).toContain('medium');
    expect(options).toContain('low');
  });

  it('FR-009: disables all inputs when isLoading is true', () => {
    render(<TaskForm onSubmit={vi.fn()} isLoading={true} />);

    const titleInput = screen.getByLabelText(/Title/i) as HTMLInputElement;
    const dueDateInput = screen.getByLabelText(/Due date/i) as HTMLInputElement;
    const prioritySelect = screen.getByLabelText(/Priority/i) as HTMLSelectElement;
    const submitButton = screen.getByRole('button', { name: /Saving/i }) as HTMLButtonElement;

    expect(titleInput.disabled).toBe(true);
    expect(dueDateInput.disabled).toBe(true);
    expect(prioritySelect.disabled).toBe(true);
    expect(submitButton.disabled).toBe(true);
  });

  it('FR-009: shows "Update Task" button text when initialValues are provided', () => {
    render(
      <TaskForm
        onSubmit={vi.fn()}
        initialValues={{
          title: 'Existing task',
          dueDate: '2026-03-15',
          priority: 'medium',
          assignedTo: 'user-1',
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /Update Task/i })).toBeDefined();
  });

  it('FR-009: renders user selector when users are provided', () => {
    const users = [
      { id: 'user-1', name: 'Jane Smith' },
      { id: 'user-2', name: 'Bob Jones' },
    ];

    render(<TaskForm onSubmit={vi.fn()} users={users} />);

    const assignedSelect = screen.getByLabelText(/Assigned to/i) as HTMLSelectElement;
    const options = Array.from(assignedSelect.options).map((opt) => opt.textContent);
    expect(options).toContain('Jane Smith');
    expect(options).toContain('Bob Jones');
  });

  it('FR-009: renders account selector when accounts are provided', () => {
    const accounts = [
      { id: 'acc-1', name: 'Portland Provisions' },
      { id: 'acc-2', name: 'Cascade Cheese Co.' },
    ];

    render(<TaskForm onSubmit={vi.fn()} accounts={accounts} />);

    const accountSelect = screen.getByLabelText(/Account/i) as HTMLSelectElement;
    const options = Array.from(accountSelect.options).map((opt) => opt.textContent);
    expect(options).toContain('Portland Provisions');
    expect(options).toContain('Cascade Cheese Co.');
  });

  it('FR-009: inputs have min-height of 44px for touch targets', () => {
    render(<TaskForm onSubmit={vi.fn()} />);

    const titleInput = screen.getByLabelText(/Title/i);
    expect(titleInput.className).toContain('min-h-[44px]');
  });

  it('FR-009: renders form with aria-label for accessibility', () => {
    render(<TaskForm onSubmit={vi.fn()} />);

    const form = screen.getByRole('form', { name: /Task form/i });
    expect(form).toBeDefined();
  });
});
