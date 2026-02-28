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
      expect(screen.getByText('Pacific Foods')).toBeDefined();
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
});
