import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import DashboardLayout from './layout';

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ replace: mockReplace })),
  usePathname: vi.fn(() => '/dashboard'),
}));

vi.mock('@/components/layout/sidebar', () => ({
  Sidebar: ({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) => (
    <nav data-testid="sidebar" data-collapsed={collapsed}>
      <button type="button" onClick={onToggle}>
        Toggle
      </button>
    </nav>
  ),
}));

vi.mock('@/components/layout/header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

vi.mock('@/components/shared/error-boundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary">{children}</div>
  ),
}));

vi.mock('@/providers/query-provider', () => ({
  QueryProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="query-provider">{children}</div>
  ),
}));

const mockLocalStorage: Record<string, string | null> = {};

describe('DashboardLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset localStorage mock
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });
  });

  it('FR-P001: redirects to /login when no access_token in localStorage', async () => {
    await act(async () => {
      render(
        <DashboardLayout>
          <div>Page Content</div>
        </DashboardLayout>,
      );
    });

    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('FR-P001: renders children when authenticated', async () => {
    mockLocalStorage['access_token'] = 'test-token';

    await act(async () => {
      render(
        <DashboardLayout>
          <div>Page Content</div>
        </DashboardLayout>,
      );
    });

    expect(screen.getByText('Page Content')).toBeInTheDocument();
  });

  it('FR-P001: renders sidebar when authenticated', async () => {
    mockLocalStorage['access_token'] = 'test-token';

    await act(async () => {
      render(
        <DashboardLayout>
          <div>Page Content</div>
        </DashboardLayout>,
      );
    });

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('FR-P001: renders header when authenticated', async () => {
    mockLocalStorage['access_token'] = 'test-token';

    await act(async () => {
      render(
        <DashboardLayout>
          <div>Page Content</div>
        </DashboardLayout>,
      );
    });

    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('FR-P001: wraps content with QueryProvider', async () => {
    mockLocalStorage['access_token'] = 'test-token';

    await act(async () => {
      render(
        <DashboardLayout>
          <div>Page Content</div>
        </DashboardLayout>,
      );
    });

    expect(screen.getByTestId('query-provider')).toBeInTheDocument();
  });

  it('FR-P001: wraps children with ErrorBoundary', async () => {
    mockLocalStorage['access_token'] = 'test-token';

    await act(async () => {
      render(
        <DashboardLayout>
          <div>Page Content</div>
        </DashboardLayout>,
      );
    });

    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
  });

  it('FR-P001: does not render children when unauthenticated (shows spinner)', () => {
    render(
      <DashboardLayout>
        <div>Page Content</div>
      </DashboardLayout>,
    );

    // Before useEffect fires, should not show page content immediately
    // The redirect happens in useEffect, so children won't render because isAuthenticated is null
    expect(screen.queryByText('Page Content')).not.toBeInTheDocument();
  });

  it('FR-P001: sidebar starts in expanded state', async () => {
    mockLocalStorage['access_token'] = 'test-token';

    await act(async () => {
      render(
        <DashboardLayout>
          <div>Page Content</div>
        </DashboardLayout>,
      );
    });

    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveAttribute('data-collapsed', 'false');
  });
});
