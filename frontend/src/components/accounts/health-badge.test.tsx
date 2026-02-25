import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { HealthBadge } from '@/components/accounts/health-badge';

// -------------------------------------------------------------------
// Tests
// -------------------------------------------------------------------

describe('T054: HealthBadge component', () => {
  it('FR-002: renders "Not calculated" when score is null', () => {
    render(<HealthBadge score={null} />);

    expect(screen.getByText('Not calculated')).toBeDefined();
    expect(screen.getByTestId('health-badge-null')).toBeDefined();
  });

  it('FR-002: renders score with green styling for scores >= 67', () => {
    render(<HealthBadge score={85} />);

    const button = screen.getByRole('button', { name: /Health score: 85/i });
    expect(button).toBeDefined();
    expect(button.textContent).toContain('85');
    expect(button.className).toContain('bg-green-50');
  });

  it('FR-002: renders score with yellow styling for scores 34-66', () => {
    render(<HealthBadge score={50} />);

    const button = screen.getByRole('button', { name: /Health score: 50/i });
    expect(button).toBeDefined();
    expect(button.className).toContain('bg-yellow-50');
  });

  it('FR-002: renders score with red styling for scores 0-33', () => {
    render(<HealthBadge score={20} />);

    const button = screen.getByRole('button', { name: /Health score: 20/i });
    expect(button).toBeDefined();
    expect(button.className).toContain('bg-red-50');
  });

  it('FR-002: shows tooltip with label on hover in compact mode', async () => {
    const user = userEvent.setup();

    render(
      <HealthBadge
        score={85}
        lastCalculatedAt="2026-02-24T02:00:00Z"
        variant="compact"
      />,
    );

    const button = screen.getByRole('button', { name: /Health score: 85/i });
    await user.hover(button);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeDefined();
    expect(tooltip.textContent).toContain('Excellent');
    expect(tooltip.textContent).toContain('Last calculated:');
  });

  it('FR-002: renders expanded variant with score, label, and progress bar', () => {
    render(
      <HealthBadge
        score={75}
        lastCalculatedAt="2026-02-24T02:00:00Z"
        variant="expanded"
      />,
    );

    const expanded = screen.getByTestId('health-badge-expanded');
    expect(expanded).toBeDefined();
    expect(screen.getByText('Health Score')).toBeDefined();
    expect(screen.getByText('75')).toBeDefined();
    expect(screen.getByText('Good')).toBeDefined();
    expect(screen.getByText(/Last calculated:/)).toBeDefined();
  });

  it('FR-002: labels score correctly at boundary values', () => {
    // Score 33 should be "Poor"
    const { unmount } = render(<HealthBadge score={33} variant="compact" />);
    expect(screen.getByRole('button', { name: /Poor/i })).toBeDefined();
    unmount();

    // Score 34 should be "Fair"
    const { unmount: unmount2 } = render(<HealthBadge score={34} variant="compact" />);
    expect(screen.getByRole('button', { name: /Fair/i })).toBeDefined();
    unmount2();

    // Score 67 should be "Good"
    const { unmount: unmount3 } = render(<HealthBadge score={67} variant="compact" />);
    expect(screen.getByRole('button', { name: /Good/i })).toBeDefined();
    unmount3();

    // Score 80 should be "Excellent"
    render(<HealthBadge score={80} variant="compact" />);
    expect(screen.getByRole('button', { name: /Excellent/i })).toBeDefined();
  });

  it('FR-002: applies custom className', () => {
    render(<HealthBadge score={null} className="mt-4" />);

    const badge = screen.getByTestId('health-badge-null');
    expect(badge.className).toContain('mt-4');
  });
});
