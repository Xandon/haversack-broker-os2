import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AccountForm } from './account-form';

describe('AccountForm', () => {
  it('FR-001: renders all required fields', () => {
    render(<AccountForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/account name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/account type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^address \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/state/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/zip/i)).toBeInTheDocument();
  });

  it('FR-001: renders optional fields', () => {
    render(<AccountForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it('FR-001: shows validation errors for empty required fields', async () => {
    const onSubmit = vi.fn();
    render(<AccountForm onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    // Form should not submit
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('FR-001: renders account type dropdown with all options', () => {
    render(<AccountForm onSubmit={vi.fn()} />);

    const select = screen.getByLabelText(/account type/i);
    expect(select).toBeInTheDocument();

    const options = select.querySelectorAll('option');
    expect(options).toHaveLength(4);
  });

  it('FR-001: shows loading state on submit button', () => {
    render(<AccountForm onSubmit={vi.fn()} isLoading={true} />);

    const button = screen.getByRole('button', { name: /saving/i });
    expect(button).toBeDisabled();
  });

  it('FR-001: pre-fills default values', () => {
    render(
      <AccountForm
        onSubmit={vi.fn()}
        defaultValues={{ name: 'Pacific Bistro', city: 'Portland' }}
      />,
    );

    expect(screen.getByLabelText(/account name/i)).toHaveValue('Pacific Bistro');
    expect(screen.getByLabelText(/city/i)).toHaveValue('Portland');
  });
});
