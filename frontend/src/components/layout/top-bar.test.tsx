import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockLogout } = vi.hoisted(() => ({
  mockLogout: vi.fn(),
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: '1', email: 'test@example.com', role: 'rep', firstName: 'Jane', lastName: 'Doe' },
    logout: mockLogout,
  }),
}));

import { TopBar } from './top-bar';

describe('TopBar', () => {
  it('renders with banner role', () => {
    render(<TopBar />);
    expect(screen.getByRole('banner')).toBeDefined();
  });

  it('displays user name on desktop', () => {
    render(<TopBar />);
    expect(screen.getByText(/Jane Doe/)).toBeDefined();
  });

  it('displays user role badge', () => {
    render(<TopBar />);
    expect(screen.getByText('rep')).toBeDefined();
  });

  it('has sign out button with aria-label', () => {
    render(<TopBar />);
    const signOutBtn = screen.getByRole('button', { name: 'Sign out' });
    expect(signOutBtn).toBeDefined();
  });

  it('calls logout on sign out click', async () => {
    render(<TopBar />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(mockLogout).toHaveBeenCalled();
  });

  it('renders hamburger button when onToggleNav provided', () => {
    const toggleFn = vi.fn();
    render(<TopBar onToggleNav={toggleFn} />);
    const hamburger = screen.getByRole('button', { name: 'Open navigation' });
    expect(hamburger).toBeDefined();
  });

  it('does not render hamburger when onToggleNav not provided', () => {
    render(<TopBar />);
    expect(screen.queryByRole('button', { name: 'Open navigation' })).toBeNull();
  });

  it('calls onToggleNav when hamburger is clicked', async () => {
    const toggleFn = vi.fn();
    render(<TopBar onToggleNav={toggleFn} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(toggleFn).toHaveBeenCalled();
  });
});
