import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthScoreBadge } from './health-score-badge';

describe('FR-033b: HealthScoreBadge component', () => {
  test('FR-033b: renders green badge for healthy score (70-100)', () => {
    render(<HealthScoreBadge score={85} />);
    const badge = screen.getByText('85');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('green');
  });

  test('FR-033b: renders green badge for score exactly 70', () => {
    render(<HealthScoreBadge score={70} />);
    const badge = screen.getByText('70');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('green');
  });

  test('FR-033b: renders yellow badge for needs-attention score (40-69)', () => {
    render(<HealthScoreBadge score={55} />);
    const badge = screen.getByText('55');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('yellow');
  });

  test('FR-033b: renders red badge for at-risk score (0-39)', () => {
    render(<HealthScoreBadge score={25} />);
    const badge = screen.getByText('25');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('red');
  });

  test('FR-033b: renders red badge for score 0', () => {
    render(<HealthScoreBadge score={0} />);
    const badge = screen.getByText('0');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('red');
  });

  test('FR-033b: renders green badge for score 100', () => {
    render(<HealthScoreBadge score={100} />);
    const badge = screen.getByText('100');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('green');
  });

  test('FR-033b: renders gray badge for null score', () => {
    render(<HealthScoreBadge score={null} />);
    const badge = screen.getByText('—');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('gray');
  });
});
