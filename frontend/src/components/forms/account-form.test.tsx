import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AccountForm } from '@/components/forms/account-form';

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe('T043: AccountForm component', () => {
  it('FR-001: renders all required fields', () => {
    render(<AccountForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/Account name/i)).toBeDefined();
    expect(screen.getByLabelText(/Account type/i)).toBeDefined();
    expect(screen.getByLabelText(/Address line 1/i)).toBeDefined();
    expect(screen.getByLabelText(/City/i)).toBeDefined();
    expect(screen.getByLabelText(/State/i)).toBeDefined();
    expect(screen.getByLabelText(/ZIP code/i)).toBeDefined();
  });

  it('FR-001: renders optional fields', () => {
    render(<AccountForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/Address line 2/i)).toBeDefined();
    expect(screen.getByLabelText(/Phone/i)).toBeDefined();
    expect(screen.getByLabelText(/Email/i)).toBeDefined();
    expect(screen.getByLabelText(/Website/i)).toBeDefined();
    expect(screen.getByLabelText(/Notes/i)).toBeDefined();
  });

  it('FR-001: shows validation errors when submitting empty form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<AccountForm onSubmit={onSubmit} />);

    const submitButton = screen.getByRole('button', { name: /Create Account/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Account name is required')).toBeDefined();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('FR-001: calls onSubmit with form values when all required fields are filled', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<AccountForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/Account name/i), 'Portland Bakery');
    await user.selectOptions(screen.getByLabelText(/Account type/i), 'Store');
    await user.type(screen.getByLabelText(/Address line 1/i), '123 Main St');
    await user.type(screen.getByLabelText(/^City/i), 'Portland');
    await user.type(screen.getByLabelText(/^State/i), 'OR');
    await user.type(screen.getByLabelText(/ZIP code/i), '97201');

    const submitButton = screen.getByRole('button', { name: /Create Account/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Portland Bakery',
        accountType: 'Store',
        addressLine1: '123 Main St',
        city: 'Portland',
        state: 'OR',
        zipCode: '97201',
      }),
      expect.anything(),
    );
  });

  it('FR-001: calls onNameBlur when name field loses focus with content', async () => {
    const user = userEvent.setup();
    const onNameBlur = vi.fn();

    render(<AccountForm onSubmit={vi.fn()} onNameBlur={onNameBlur} />);

    const nameInput = screen.getByLabelText(/Account name/i);
    await user.type(nameInput, 'Portland Bakery');
    await user.tab(); // blur the field

    expect(onNameBlur).toHaveBeenCalledWith('Portland Bakery');
  });

  it('FR-001: does not call onNameBlur when name is empty', async () => {
    const user = userEvent.setup();
    const onNameBlur = vi.fn();

    render(<AccountForm onSubmit={vi.fn()} onNameBlur={onNameBlur} />);

    const nameInput = screen.getByLabelText(/Account name/i);
    await user.click(nameInput);
    await user.tab(); // blur with empty field

    expect(onNameBlur).not.toHaveBeenCalled();
  });

  it('FR-001: displays duplicate warning when duplicates prop is provided', () => {
    const duplicates = [
      {
        id: 'dup-1',
        name: 'Portland Provisions',
        confidence: 92,
        matchedFields: ['name'],
      },
    ];

    render(
      <AccountForm
        onSubmit={vi.fn()}
        duplicates={duplicates}
        onViewExisting={vi.fn()}
        onCreateAnyway={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Portland Provisions')).toBeDefined();
  });

  it('FR-001: disables all inputs when isLoading is true', () => {
    render(<AccountForm onSubmit={vi.fn()} isLoading={true} />);

    const nameInput = screen.getByLabelText(/Account name/i) as HTMLInputElement;
    const typeSelect = screen.getByLabelText(/Account type/i) as HTMLSelectElement;
    const submitButton = screen.getByRole('button', { name: /Saving/i }) as HTMLButtonElement;

    expect(nameInput.disabled).toBe(true);
    expect(typeSelect.disabled).toBe(true);
    expect(submitButton.disabled).toBe(true);
  });

  it('FR-001: shows "Update Account" button text when initialValues are provided', () => {
    render(
      <AccountForm
        onSubmit={vi.fn()}
        initialValues={{
          name: 'Existing Account',
          accountType: 'Store',
          addressLine1: '123 Main St',
          city: 'Portland',
          state: 'OR',
          zipCode: '97201',
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /Update Account/i })).toBeDefined();
  });

  it('FR-001: populates fields with initialValues', () => {
    render(
      <AccountForm
        onSubmit={vi.fn()}
        initialValues={{
          name: 'Existing Account',
          accountType: 'Restaurant',
          addressLine1: '456 Elm St',
          city: 'Seattle',
          state: 'WA',
          zipCode: '98101',
        }}
      />,
    );

    const nameInput = screen.getByLabelText(/Account name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Existing Account');

    const cityInput = screen.getByLabelText(/^City/i) as HTMLInputElement;
    expect(cityInput.value).toBe('Seattle');
  });

  it('FR-001: validates ZIP code format', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<AccountForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/Account name/i), 'Test');
    await user.selectOptions(screen.getByLabelText(/Account type/i), 'Store');
    await user.type(screen.getByLabelText(/Address line 1/i), '123 St');
    await user.type(screen.getByLabelText(/^City/i), 'Portland');
    await user.type(screen.getByLabelText(/^State/i), 'OR');
    await user.type(screen.getByLabelText(/ZIP code/i), 'invalid');

    await user.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Enter a valid ZIP code/i)).toBeDefined();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('FR-001: inputs have min-height of 44px for touch targets', () => {
    render(<AccountForm onSubmit={vi.fn()} />);

    const nameInput = screen.getByLabelText(/Account name/i);
    expect(nameInput.className).toContain('min-h-[44px]');
  });

  it('FR-001: renders form with aria-label for accessibility', () => {
    render(<AccountForm onSubmit={vi.fn()} />);

    const form = screen.getByRole('form', { name: /Account form/i });
    expect(form).toBeDefined();
  });

  it('FR-001: hides territory and rep fields by default', () => {
    render(<AccountForm onSubmit={vi.fn()} />);

    expect(screen.queryByLabelText(/Territory ID/i)).toBeNull();
    expect(screen.queryByLabelText(/Assigned Rep ID/i)).toBeNull();
  });

  it('FR-001: shows territory field when showTerritoryField is true', () => {
    render(<AccountForm onSubmit={vi.fn()} showTerritoryField={true} />);

    expect(screen.getByLabelText(/Territory ID/i)).toBeDefined();
  });

  it('FR-001: shows rep field when showRepField is true', () => {
    render(<AccountForm onSubmit={vi.fn()} showRepField={true} />);

    expect(screen.getByLabelText(/Assigned Rep ID/i)).toBeDefined();
  });

  it('FR-001: has account type options for Store, Restaurant, Distributor, Other', () => {
    render(<AccountForm onSubmit={vi.fn()} />);

    const select = screen.getByLabelText(/Account type/i) as HTMLSelectElement;
    const options = Array.from(select.options).map((opt) => opt.value);

    expect(options).toContain('Store');
    expect(options).toContain('Restaurant');
    expect(options).toContain('Distributor');
    expect(options).toContain('Other');
  });
});
