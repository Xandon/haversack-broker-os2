import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const { mockReplace } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({ replace: mockReplace }),
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

import { ProtectedRoute } from './protected-route';

describe('ProtectedRoute', () => {
  it('shows skeleton while loading', async () => {
    const { useAuth } = await import('@/providers/auth-provider');
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );

    expect(screen.queryByText('Protected Content')).toBeNull();
  });

  it('renders children when authenticated', async () => {
    const { useAuth } = await import('@/providers/auth-provider');
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Protected Content')).toBeDefined();
  });

  it('redirects to login when not authenticated', async () => {
    const { useAuth } = await import('@/providers/auth-provider');
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
    );

    expect(mockReplace).toHaveBeenCalledWith('/login');
  });
});
