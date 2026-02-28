import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { CommandPalette } from './command-palette';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock api-client
vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn().mockResolvedValue({ data: [] }),
}));

// Mock useDebounce to be instant
vi.mock('@/hooks/use-debounce', () => ({
  useDebounce: (value: string, _delay: number) => value,
}));

function createWrapper(): ({ children }: { children: ReactNode }) => React.ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): React.ReactElement {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function renderPalette(): ReturnType<typeof render> {
  return render(
    createElement(createWrapper(), null, createElement(CommandPalette)),
  );
}

describe('FR-032: CommandPalette component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FR-032: opens on Cmd+K keyboard shortcut', async () => {
    renderPalette();

    // Palette should not be visible initially
    expect(screen.queryByPlaceholderText(/search accounts/i)).toBeNull();

    // Simulate Cmd+K
    fireEvent.keyDown(document, { key: 'k', metaKey: true });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search accounts/i)).toBeDefined();
    });
  });

  it('FR-032: opens on Ctrl+K keyboard shortcut', async () => {
    renderPalette();

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search accounts/i)).toBeDefined();
    });
  });

  it('FR-032: toggles closed on second Cmd+K press', async () => {
    renderPalette();

    // Open
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search accounts/i)).toBeDefined();
    });

    // Close
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/search accounts/i)).toBeNull();
    });
  });

  it('FR-032: shows minimum characters message for short queries', async () => {
    renderPalette();

    fireEvent.keyDown(document, { key: 'k', metaKey: true });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search accounts/i)).toBeDefined();
    });

    // Type 1 character
    const input = screen.getByPlaceholderText(/search accounts/i);
    fireEvent.change(input, { target: { value: 'a' } });

    await waitFor(() => {
      expect(screen.getByText(/type at least 2 characters/i)).toBeDefined();
    });
  });

  it('FR-032: shows no results message for empty search', async () => {
    renderPalette();

    fireEvent.keyDown(document, { key: 'k', metaKey: true });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search accounts/i)).toBeDefined();
    });

    const input = screen.getByPlaceholderText(/search accounts/i);
    fireEvent.change(input, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText(/no results found/i)).toBeDefined();
    });
  });

  it('FR-032: displays search results grouped by category', async () => {
    const { apiClient } = await import('@/lib/api-client');
    const mockApiClient = apiClient as ReturnType<typeof vi.fn>;

    mockApiClient.mockImplementation((url: string) => {
      if (url.includes('/api/accounts')) {
        return Promise.resolve({
          data: [{ id: 'acc-1', name: 'Pacific Foods', territory: { name: 'Portland' } }],
        });
      }
      if (url.includes('/api/contacts')) {
        return Promise.resolve({
          data: [{ id: 'con-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@test.com', phone: null, accountId: 'acc-1', accountName: 'Pacific Foods' }],
        });
      }
      if (url.includes('/api/products')) {
        return Promise.resolve({
          data: [{ id: 'prod-1', name: 'Sourdough', sku: 'SDB-001' }],
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderPalette();

    fireEvent.keyDown(document, { key: 'k', metaKey: true });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search accounts/i)).toBeDefined();
    });

    const input = screen.getByPlaceholderText(/search accounts/i);
    fireEvent.change(input, { target: { value: 'pacific' } });

    await waitFor(() => {
      expect(screen.getByText('Accounts')).toBeDefined();
      expect(screen.getByText('Contacts')).toBeDefined();
      expect(screen.getByText('Products')).toBeDefined();
      expect(screen.getAllByText('Pacific Foods').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Jane Doe')).toBeDefined();
      expect(screen.getByText('Sourdough')).toBeDefined();
    });
  });

  it('FR-032: navigates on result selection', async () => {
    const { apiClient } = await import('@/lib/api-client');
    const mockApiClient = apiClient as ReturnType<typeof vi.fn>;

    mockApiClient.mockImplementation((url: string) => {
      if (url.includes('/api/accounts')) {
        return Promise.resolve({
          data: [{ id: 'acc-1', name: 'Pacific Foods', territory: { name: 'Portland' } }],
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderPalette();

    fireEvent.keyDown(document, { key: 'k', metaKey: true });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search accounts/i)).toBeDefined();
    });

    const input = screen.getByPlaceholderText(/search accounts/i);
    fireEvent.change(input, { target: { value: 'pacific' } });

    await waitFor(() => {
      expect(screen.getByText('Pacific Foods')).toBeDefined();
    });

    // Click the result
    fireEvent.click(screen.getByText('Pacific Foods'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/accounts/acc-1');
    });
  });

  it('FR-032: hides empty categories', async () => {
    const { apiClient } = await import('@/lib/api-client');
    const mockApiClient = apiClient as ReturnType<typeof vi.fn>;

    mockApiClient.mockImplementation((url: string) => {
      if (url.includes('/api/accounts')) {
        return Promise.resolve({
          data: [{ id: 'acc-1', name: 'Pacific Foods', territory: { name: 'Portland' } }],
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderPalette();

    fireEvent.keyDown(document, { key: 'k', metaKey: true });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search accounts/i)).toBeDefined();
    });

    const input = screen.getByPlaceholderText(/search accounts/i);
    fireEvent.change(input, { target: { value: 'pacific' } });

    await waitFor(() => {
      expect(screen.getByText('Accounts')).toBeDefined();
    });

    // Contacts and Products groups should not be rendered when they have no results
    expect(screen.queryByText('Contacts')).toBeNull();
    expect(screen.queryByText('Products')).toBeNull();
  });

  it('FR-032: has search placeholder text', async () => {
    renderPalette();

    fireEvent.keyDown(document, { key: 'k', metaKey: true });

    await waitFor(() => {
      const input = screen.getByPlaceholderText(/search accounts, contacts, products/i);
      expect(input).toBeDefined();
    });
  });

  // T278: Backdrop click to close
  it('FR-032: closes when dialog onOpenChange fires false (backdrop click)', async () => {
    renderPalette();

    // Open palette
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search accounts/i)).toBeDefined();
    });

    // Press Escape (simulates backdrop/close behavior)
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/search accounts/i)).toBeNull();
    });
  });

  // T279: Error state with retry
  it('FR-032: shows retry button when all searches error', async () => {
    const { apiClient } = await import('@/lib/api-client');
    const mockApiClient = apiClient as ReturnType<typeof vi.fn>;

    mockApiClient.mockRejectedValue(new Error('Network error'));

    renderPalette();

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search accounts/i)).toBeDefined();
    });

    const input = screen.getByPlaceholderText(/search accounts/i);
    fireEvent.change(input, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText(/search unavailable/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /retry/i })).toBeDefined();
    });
  });

  it('FR-032: retry button triggers refetch', async () => {
    const { apiClient } = await import('@/lib/api-client');
    const mockApiClient = apiClient as ReturnType<typeof vi.fn>;

    let callCount = 0;
    mockApiClient.mockImplementation(() => {
      callCount++;
      if (callCount <= 3) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({ data: [] });
    });

    renderPalette();

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search accounts/i)).toBeDefined();
    });

    const input = screen.getByPlaceholderText(/search accounts/i);
    fireEvent.change(input, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeDefined();
    });

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);

    // After retry, the API should be called again
    await waitFor(() => {
      expect(callCount).toBeGreaterThan(3);
    });
  });

  // T280: Mobile full-screen overlay
  it('FR-032: shows close button on mobile viewport', async () => {
    // Mock matchMedia to simulate mobile viewport
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(max-width: 767px)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    renderPalette();

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search accounts/i)).toBeDefined();
    });

    // Should show our custom close button for mobile (distinct from Radix's built-in)
    expect(screen.getByLabelText('Close search')).toBeDefined();

    window.matchMedia = originalMatchMedia;
  });

  it('FR-032: close button dismisses palette on mobile', async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(max-width: 767px)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    renderPalette();

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search accounts/i)).toBeDefined();
    });

    const closeBtn = screen.getByLabelText('Close search');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/search accounts/i)).toBeNull();
    });

    window.matchMedia = originalMatchMedia;
  });

  // T281: Accessibility
  it('FR-032: dialog has aria-label for accessibility', async () => {
    renderPalette();

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search accounts/i)).toBeDefined();
    });

    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-label')).toBe('Global search');
  });

  it('FR-032: announces result count via live region', async () => {
    const { apiClient } = await import('@/lib/api-client');
    const mockApiClient = apiClient as ReturnType<typeof vi.fn>;

    mockApiClient.mockImplementation((url: string) => {
      if (url.includes('/api/accounts')) {
        return Promise.resolve({
          data: [
            { id: 'acc-1', name: 'Pacific Foods', territory: { name: 'Portland' } },
            { id: 'acc-2', name: 'Pacific Organics', territory: { name: 'Seattle' } },
          ],
        });
      }
      if (url.includes('/api/contacts')) {
        return Promise.resolve({
          data: [
            { id: 'con-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@test.com', phone: null, accountId: 'acc-1', accountName: 'Pacific Foods' },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderPalette();

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search accounts/i)).toBeDefined();
    });

    const input = screen.getByPlaceholderText(/search accounts/i);
    fireEvent.change(input, { target: { value: 'pacific' } });

    await waitFor(() => {
      const liveRegion = screen.getByRole('status', { name: /search results/i }) ??
        document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeDefined();
      expect(liveRegion?.textContent).toContain('2 accounts');
      expect(liveRegion?.textContent).toContain('1 contact');
    });
  });

  // T282: Contact display with tertiary text
  it('FR-032: shows account name as tertiary text for contact results', async () => {
    const { apiClient } = await import('@/lib/api-client');
    const mockApiClient = apiClient as ReturnType<typeof vi.fn>;

    mockApiClient.mockImplementation((url: string) => {
      if (url.includes('/api/contacts')) {
        return Promise.resolve({
          data: [
            { id: 'con-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@test.com', phone: null, accountId: 'acc-1', accountName: 'Pacific Foods' },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderPalette();

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search accounts/i)).toBeDefined();
    });

    const input = screen.getByPlaceholderText(/search accounts/i);
    fireEvent.change(input, { target: { value: 'jane' } });

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeDefined();
      expect(screen.getByText('jane@test.com')).toBeDefined();
      expect(screen.getByText('Pacific Foods')).toBeDefined();
    });
  });

  // T283: Integration test — full search flow
  it('FR-032: integration — full search flow from open to navigate', async () => {
    const { apiClient } = await import('@/lib/api-client');
    const mockApiClient = apiClient as ReturnType<typeof vi.fn>;

    mockApiClient.mockImplementation((url: string) => {
      if (url.includes('/api/accounts')) {
        return Promise.resolve({
          data: [{ id: 'acc-1', name: 'Pacific Foods', territory: { name: 'Portland' } }],
        });
      }
      if (url.includes('/api/contacts')) {
        return Promise.resolve({
          data: [{ id: 'con-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@test.com', phone: null, accountId: 'acc-1', accountName: 'Pacific Foods' }],
        });
      }
      if (url.includes('/api/products')) {
        return Promise.resolve({
          data: [{ id: 'prod-1', name: 'Artisan Sourdough', sku: 'ASB-001' }],
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderPalette();

    // Step 1: Open via keyboard shortcut
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search accounts/i)).toBeDefined();
    });

    // Step 2: Type a query
    const input = screen.getByPlaceholderText(/search accounts/i);
    fireEvent.change(input, { target: { value: 'p' } });

    // Step 3: Verify minimum character message
    await waitFor(() => {
      expect(screen.getByText(/type at least 2 characters/i)).toBeDefined();
    });

    // Step 4: Type enough characters
    fireEvent.change(input, { target: { value: 'pacific' } });

    // Step 5: Verify results appear grouped by category
    await waitFor(() => {
      expect(screen.getByText('Accounts')).toBeDefined();
      expect(screen.getByText('Contacts')).toBeDefined();
      expect(screen.getByText('Products')).toBeDefined();
      expect(screen.getAllByText('Pacific Foods').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Jane Doe')).toBeDefined();
      expect(screen.getByText('Artisan Sourdough')).toBeDefined();
    });

    // Step 6: Click account result to navigate (first occurrence of Pacific Foods is the account)
    fireEvent.click(screen.getAllByText('Pacific Foods')[0]);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/accounts/acc-1');
    });

    // Step 7: Palette should close after navigation
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/search accounts/i)).toBeNull();
    });
  });

  it('FR-032: integration — open, search, close via Escape', async () => {
    const { apiClient } = await import('@/lib/api-client');
    const mockApiClient = apiClient as ReturnType<typeof vi.fn>;
    mockApiClient.mockResolvedValue({ data: [] });

    renderPalette();

    // Open
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search accounts/i)).toBeDefined();
    });

    // Type something
    const input = screen.getByPlaceholderText(/search accounts/i);
    fireEvent.change(input, { target: { value: 'test' } });

    // Close via Escape
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/search accounts/i)).toBeNull();
    });

    // Reopen — query should be cleared
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(() => {
      const reopenedInput = screen.getByPlaceholderText(/search accounts/i) as HTMLInputElement;
      expect(reopenedInput.value).toBe('');
    });
  });
});
