import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SearchBar } from '@/components/shared/search-bar';

// -------------------------------------------------------------------
// Mocks
// -------------------------------------------------------------------

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const mockSearchResults = [
  { id: 'acc-1', name: 'Portland Provisions', city: 'Portland', account_type: 'Store' },
  { id: 'acc-2', name: 'Portland Produce', city: 'Portland', account_type: 'Restaurant' },
];

let mockSearchData: typeof mockSearchResults = [];
let mockIsLoading = false;

vi.mock('@/hooks/use-search', () => ({
  useSearch: () => ({
    data: mockSearchData,
    isLoading: mockIsLoading,
    error: null,
  }),
}));

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe('T060: SearchBar component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchData = [];
    mockIsLoading = false;
  });

  it('FR-002: renders search input with placeholder', () => {
    render(<SearchBar />);

    const input = screen.getByRole('combobox', { name: /Search accounts/i });
    expect(input).toBeDefined();
    expect(input.getAttribute('placeholder')).toBe('Search accounts...');
  });

  it('FR-002: shows "No results found" when search returns empty', async () => {
    mockSearchData = [];
    const user = userEvent.setup();

    render(<SearchBar />);

    const input = screen.getByRole('combobox', { name: /Search accounts/i });
    await user.type(input, 'xyz');

    // Wait for debounce and dropdown to appear
    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeDefined();
    });
  });

  it('FR-002: shows search results in dropdown', async () => {
    mockSearchData = mockSearchResults;
    const user = userEvent.setup();

    render(<SearchBar />);

    const input = screen.getByRole('combobox', { name: /Search accounts/i });
    await user.type(input, 'po');

    await waitFor(() => {
      expect(screen.getByText('Portland Provisions')).toBeDefined();
      expect(screen.getByText('Portland Produce')).toBeDefined();
    });
  });

  it('FR-002: navigates to account detail on result click', async () => {
    mockSearchData = mockSearchResults;
    const user = userEvent.setup();

    render(<SearchBar />);

    const input = screen.getByRole('combobox', { name: /Search accounts/i });
    await user.type(input, 'po');

    await waitFor(() => {
      expect(screen.getByText('Portland Provisions')).toBeDefined();
    });

    await user.click(screen.getByText('Portland Provisions'));

    expect(mockPush).toHaveBeenCalledWith('/accounts/acc-1');
  });

  it('FR-002: supports keyboard navigation with Enter to select', async () => {
    mockSearchData = mockSearchResults;
    const user = userEvent.setup();

    render(<SearchBar />);

    const input = screen.getByRole('combobox', { name: /Search accounts/i });
    await user.type(input, 'po');

    await waitFor(() => {
      expect(screen.getByText('Portland Provisions')).toBeDefined();
    });

    // Arrow down then Enter
    await user.keyboard('{ArrowDown}{Enter}');

    expect(mockPush).toHaveBeenCalledWith('/accounts/acc-1');
  });

  it('FR-002: closes dropdown on Escape key', async () => {
    mockSearchData = mockSearchResults;
    const user = userEvent.setup();

    render(<SearchBar />);

    const input = screen.getByRole('combobox', { name: /Search accounts/i });
    await user.type(input, 'po');

    await waitFor(() => {
      expect(screen.getByText('Portland Provisions')).toBeDefined();
    });

    await user.keyboard('{Escape}');

    expect(screen.queryByText('Portland Provisions')).toBeNull();
  });

  it('FR-002: shows loading state while searching', async () => {
    mockSearchData = [];
    mockIsLoading = true;
    const user = userEvent.setup();

    render(<SearchBar />);

    const input = screen.getByRole('combobox', { name: /Search accounts/i });
    await user.type(input, 'po');

    await waitFor(() => {
      expect(screen.getByText('Searching...')).toBeDefined();
    });
  });

  it('FR-002: has proper ARIA attributes for combobox pattern', () => {
    render(<SearchBar />);

    const input = screen.getByRole('combobox', { name: /Search accounts/i });
    expect(input.getAttribute('aria-haspopup')).toBe('listbox');
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });
});
