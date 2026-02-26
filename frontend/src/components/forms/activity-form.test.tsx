import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ActivityForm } from '@/components/forms/activity-form';

// -------------------------------------------------------------------
// Mocks
// -------------------------------------------------------------------

const mockUser = {
  id: 'user-1',
  email: 'rep@haversack.com',
  firstName: 'Jane',
  lastName: 'Smith',
  role: 'rep' as const,
  tenantId: 'tenant-1',
};

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    token: 'test-token',
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-search', () => ({
  useSearch: (query: string) => ({
    data:
      query.length >= 2
        ? [
            {
              id: 'acc-1',
              name: 'Portland Provisions',
              city: 'Portland',
              account_type: 'Store',
            },
          ]
        : [],
    isLoading: false,
    error: null,
  }),
}));

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe('T069: ActivityForm component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FR-008: renders all core fields', () => {
    render(<ActivityForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/Date/i)).toBeDefined();
    expect(screen.getByLabelText(/Activity type/i)).toBeDefined();
    expect(screen.getByLabelText(/Subject/i)).toBeDefined();
    expect(screen.getByLabelText(/Notes/i)).toBeDefined();
    expect(screen.getByLabelText(/Search accounts/i)).toBeDefined();
  });

  it('FR-008: pre-populates date with today', () => {
    render(<ActivityForm onSubmit={vi.fn()} />);

    const dateInput = screen.getByLabelText(/Date/i) as HTMLInputElement;
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    expect(dateInput.value).toBe(`${year}-${month}-${day}`);
  });

  it('FR-008: displays current user name', () => {
    render(<ActivityForm onSubmit={vi.fn()} />);

    expect(screen.getByText(/Logging as: Jane Smith/i)).toBeDefined();
  });

  it('FR-008: shows validation errors when submitting empty form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<ActivityForm onSubmit={onSubmit} />);

    const submitButton = screen.getByRole('button', { name: /Log Activity/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Subject is required')).toBeDefined();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('FR-008: has all six activity type options', () => {
    render(<ActivityForm onSubmit={vi.fn()} />);

    const select = screen.getByLabelText(/Activity type/i) as HTMLSelectElement;
    const options = Array.from(select.options).map((opt) => opt.value);

    expect(options).toContain('visit');
    expect(options).toContain('call');
    expect(options).toContain('email');
    expect(options).toContain('demo');
    expect(options).toContain('sampling');
    expect(options).toContain('note');
  });

  it('FR-008: shows duration field when visit type is selected', async () => {
    const user = userEvent.setup();
    render(<ActivityForm onSubmit={vi.fn()} />);

    // Duration should not be visible initially
    expect(screen.queryByLabelText(/Duration/i)).toBeNull();

    // Select visit type
    await user.selectOptions(screen.getByLabelText(/Activity type/i), 'visit');

    expect(screen.getByLabelText(/Duration/i)).toBeDefined();
  });

  it('FR-008: shows duration field when call type is selected', async () => {
    const user = userEvent.setup();
    render(<ActivityForm onSubmit={vi.fn()} />);

    await user.selectOptions(screen.getByLabelText(/Activity type/i), 'call');

    expect(screen.getByLabelText(/Duration/i)).toBeDefined();
  });

  it('FR-008: shows demo-specific fields when demo type is selected', async () => {
    const user = userEvent.setup();
    render(<ActivityForm onSubmit={vi.fn()} />);

    // Demo fields should not be visible initially
    expect(screen.queryByLabelText(/Product demoed/i)).toBeNull();
    expect(screen.queryByLabelText(/Quantity sampled/i)).toBeNull();
    expect(screen.queryByLabelText(/Buyer feedback/i)).toBeNull();

    await user.selectOptions(screen.getByLabelText(/Activity type/i), 'demo');

    expect(screen.getByLabelText(/Product demoed/i)).toBeDefined();
    expect(screen.getByLabelText(/Quantity sampled/i)).toBeDefined();
    expect(screen.getByLabelText(/Buyer feedback/i)).toBeDefined();
  });

  it('FR-008: shows products field when sampling type is selected', async () => {
    const user = userEvent.setup();
    render(<ActivityForm onSubmit={vi.fn()} />);

    expect(screen.queryByLabelText(/^Products$/i)).toBeNull();

    await user.selectOptions(screen.getByLabelText(/Activity type/i), 'sampling');

    expect(screen.getByLabelText(/^Products$/i)).toBeDefined();
  });

  it('FR-008: disables all inputs when isLoading is true', () => {
    render(<ActivityForm onSubmit={vi.fn()} isLoading={true} />);

    const dateInput = screen.getByLabelText(/Date/i) as HTMLInputElement;
    const typeSelect = screen.getByLabelText(/Activity type/i) as HTMLSelectElement;
    const subjectInput = screen.getByLabelText(/Subject/i) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /Saving/i }) as HTMLButtonElement;

    expect(dateInput.disabled).toBe(true);
    expect(typeSelect.disabled).toBe(true);
    expect(subjectInput.disabled).toBe(true);
    expect(submitButton.disabled).toBe(true);
  });

  it('FR-008: inputs have min-height of 44px for touch targets', () => {
    render(<ActivityForm onSubmit={vi.fn()} />);

    const subjectInput = screen.getByLabelText(/Subject/i);
    expect(subjectInput.className).toContain('min-h-[44px]');
  });

  it('FR-008: renders form with aria-label for accessibility', () => {
    render(<ActivityForm onSubmit={vi.fn()} />);

    const form = screen.getByRole('form', { name: /Activity form/i });
    expect(form).toBeDefined();
  });

  it('FR-008: shows contact selector when contacts are provided', () => {
    const contacts = [
      { id: 'contact-1', name: 'John Doe' },
      { id: 'contact-2', name: 'Jane Roe' },
    ];

    render(<ActivityForm onSubmit={vi.fn()} contacts={contacts} />);

    const contactSelect = screen.getByLabelText(/Contact/i) as HTMLSelectElement;
    const options = Array.from(contactSelect.options).map((opt) => opt.textContent);
    expect(options).toContain('John Doe');
    expect(options).toContain('Jane Roe');
  });

  it('FR-008: account search shows results dropdown', async () => {
    const user = userEvent.setup();
    render(<ActivityForm onSubmit={vi.fn()} />);

    const accountInput = screen.getByLabelText(/Search accounts/i);
    await user.type(accountInput, 'Portland');

    // Wait for debounced search results dropdown
    await waitFor(() => {
      expect(screen.getByText('Portland Provisions')).toBeDefined();
    });
  });
});
