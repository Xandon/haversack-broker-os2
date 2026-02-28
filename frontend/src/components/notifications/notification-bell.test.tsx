import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { NotificationBell } from './notification-bell';

describe('NotificationBell', () => {
  it('FR-009: renders bell icon without badge when no unread', () => {
    render(<NotificationBell unreadCount={0} onClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('FR-009: shows unread count badge', () => {
    render(<NotificationBell unreadCount={5} onClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Notifications (5 unread)' })).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('FR-009: caps badge display at 99+', () => {
    render(<NotificationBell unreadCount={150} onClick={vi.fn()} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('FR-009: calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<NotificationBell unreadCount={3} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
