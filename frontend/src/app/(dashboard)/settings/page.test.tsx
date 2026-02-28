import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import SettingsPage from './page';

vi.mock('@/components/shared/error-banner', () => ({
  ErrorBanner: ({ message }: { message: string }) => (
    <div role="alert">
      <p>{message}</p>
    </div>
  ),
}));

vi.mock('@/components/shared/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} role="status" aria-label="Loading" />
  ),
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FR-P018: renders "Settings" heading', () => {
    render(<SettingsPage />);

    expect(screen.getByRole('heading', { name: /settings/i, level: 1 })).toBeInTheDocument();
  });

  it('FR-P018: renders Profile section heading', () => {
    render(<SettingsPage />);

    expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument();
  });

  it('FR-P018: renders Display Name input', () => {
    render(<SettingsPage />);

    const displayNameInput = screen.getByLabelText(/display name/i);
    expect(displayNameInput).toBeInTheDocument();
    expect(displayNameInput).toHaveAttribute('type', 'text');
    expect(displayNameInput).toHaveAttribute('placeholder', 'Your name');
  });

  it('FR-P018: renders Email input that is disabled', () => {
    render(<SettingsPage />);

    // Use the label htmlFor="email" to select specifically the Email profile input
    const emailInput = screen.getByRole('textbox', { name: /^email$/i });
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toBeDisabled();
    expect(emailInput).toHaveAttribute('placeholder', 'you@haversack.com');
  });

  it('FR-P018: renders Notification Preferences section heading', () => {
    render(<SettingsPage />);

    expect(screen.getByRole('heading', { name: /notification preferences/i })).toBeInTheDocument();
  });

  it('FR-P018: renders Email notifications toggle switch', () => {
    render(<SettingsPage />);

    expect(screen.getByText('Email notifications')).toBeInTheDocument();
  });

  it('FR-P018: renders Push notifications toggle switch', () => {
    render(<SettingsPage />);

    expect(screen.getByText('Push notifications')).toBeInTheDocument();
  });

  it('FR-P018: toggle switches have correct default states (both on)', () => {
    render(<SettingsPage />);

    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(2);

    // Both should default to checked (true)
    expect(switches[0]).toHaveAttribute('aria-checked', 'true');
    expect(switches[1]).toHaveAttribute('aria-checked', 'true');
  });

  it('FR-P018: clicking email notification switch toggles it off', () => {
    render(<SettingsPage />);

    const switches = screen.getAllByRole('switch');
    const emailSwitch = switches[0];

    expect(emailSwitch).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(emailSwitch);

    expect(emailSwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('FR-P018: clicking push notification switch toggles it off', () => {
    render(<SettingsPage />);

    const switches = screen.getAllByRole('switch');
    const pushSwitch = switches[1];

    expect(pushSwitch).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(pushSwitch);

    expect(pushSwitch).toHaveAttribute('aria-checked', 'false');
  });
});
