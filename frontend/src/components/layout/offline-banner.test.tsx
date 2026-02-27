import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: vi.fn(),
}));

import { OfflineBanner } from './offline-banner';

describe('OfflineBanner', () => {
  it('renders nothing when online', async () => {
    const { useOnlineStatus } = await import('@/hooks/use-online-status');
    (useOnlineStatus as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const { container } = render(<OfflineBanner />);
    expect(container.innerHTML).toBe('');
  });

  it('renders banner when offline', async () => {
    const { useOnlineStatus } = await import('@/hooks/use-online-status');
    (useOnlineStatus as ReturnType<typeof vi.fn>).mockReturnValue(false);

    render(<OfflineBanner />);
    expect(screen.getByText(/You are offline/)).toBeDefined();
  });

  it('has status role and aria-live for accessibility', async () => {
    const { useOnlineStatus } = await import('@/hooks/use-online-status');
    (useOnlineStatus as ReturnType<typeof vi.fn>).mockReturnValue(false);

    render(<OfflineBanner />);
    const banner = screen.getByRole('status');
    expect(banner.getAttribute('aria-live')).toBe('polite');
  });
});
