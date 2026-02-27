import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/dashboard'),
}));

// Mock the dynamic imports
vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
}));

vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
  },
}));

describe('MonitoringProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env vars
    delete process.env['NEXT_PUBLIC_SENTRY_DSN'];
    delete process.env['NEXT_PUBLIC_POSTHOG_KEY'];
  });

  it('renders children', async () => {
    const { MonitoringProvider } = await import('./monitoring-provider');
    render(
      <MonitoringProvider>
        <div data-testid="child">Hello</div>
      </MonitoringProvider>,
    );
    expect(screen.getByTestId('child')).toBeDefined();
  });

  it('does not crash without env vars', async () => {
    const { MonitoringProvider } = await import('./monitoring-provider');
    expect(() => {
      render(
        <MonitoringProvider>
          <div>Test</div>
        </MonitoringProvider>,
      );
    }).not.toThrow();
  });
});
