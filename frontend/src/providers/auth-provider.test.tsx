import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './auth-provider';

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  loadStoredRefreshToken: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue(null),
}));

function TestConsumer(): React.ReactElement {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <button onClick={() => void login('test@example.com', 'pass')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children and starts in loading state', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    // After effect runs, loading should be false (no stored token)
    await vi.waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('provides login function that sets user', async () => {
    const { apiClient } = await import('@/lib/api-client');
    (apiClient as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      accessToken: 'access',
      refreshToken: 'refresh',
      user: { id: '1', email: 'test@example.com', role: 'rep', firstName: 'Test', lastName: 'User' },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await vi.waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      await userEvent.click(screen.getByText('Login'));
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user').textContent).toBe('test@example.com');
  });

  it('provides logout function that clears user', async () => {
    const { apiClient } = await import('@/lib/api-client');
    (apiClient as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      accessToken: 'access',
      refreshToken: 'refresh',
      user: { id: '1', email: 'test@example.com', role: 'rep', firstName: 'Test', lastName: 'User' },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await vi.waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      await userEvent.click(screen.getByText('Login'));
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('true');

    await act(async () => {
      await userEvent.click(screen.getByText('Logout'));
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('throws when useAuth is used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within an AuthProvider');
    spy.mockRestore();
  });
});
