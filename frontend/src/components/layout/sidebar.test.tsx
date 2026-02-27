import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/dashboard'),
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: '1', email: 'test@example.com', role: 'admin', firstName: 'Test', lastName: 'User' },
  }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string } & Record<string, unknown>) => {
    const anchorProps: Record<string, unknown> = { href };
    if (props['aria-current']) anchorProps['aria-current'] = props['aria-current'];
    if (props.className) anchorProps.className = props.className;
    return <a {...anchorProps}>{children}</a>;
  },
}));

import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  it('renders with navigation role', () => {
    render(<Sidebar />);
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeDefined();
  });

  it('renders Haversack brand link', () => {
    render(<Sidebar />);
    expect(screen.getByText('Haversack')).toBeDefined();
  });

  it('renders nav items visible to admin', () => {
    render(<Sidebar />);
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Accounts')).toBeDefined();
    expect(screen.getByText('Orders')).toBeDefined();
    expect(screen.getByText('Admin')).toBeDefined();
    expect(screen.getByText('Rules')).toBeDefined();
  });

  it('marks active nav item with aria-current', () => {
    render(<Sidebar />);
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink?.getAttribute('aria-current')).toBe('page');
  });

  it('is hidden on mobile (md:flex class)', () => {
    render(<Sidebar />);
    const aside = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(aside.className).toContain('hidden');
    expect(aside.className).toContain('md:flex');
  });

  it('filters nav items by role', async () => {
    const { useAuth } = await import('@/providers/auth-provider');
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: '2', email: 'rep@example.com', role: 'viewer', firstName: 'View', lastName: 'User' },
    });

    render(<Sidebar />);
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.queryByText('Admin')).toBeNull();
    expect(screen.queryByText('Rules')).toBeNull();
  });
});
