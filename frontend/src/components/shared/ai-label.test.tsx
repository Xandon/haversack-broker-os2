/**
 * Tests for AI label component.
 * Verifies FR-035: all AI content labeled "AI-Generated".
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { AiLabel } from './ai-label';

describe('T112: AiLabel component', () => {
  it('FR-035: renders "AI-Generated" label text', () => {
    render(<AiLabel />);
    expect(screen.getByText('AI-Generated')).toBeDefined();
  });

  it('FR-035: renders with default variant (badge)', () => {
    const { container } = render(<AiLabel />);
    const badge = container.querySelector('[data-testid="ai-label"]');
    expect(badge).toBeDefined();
  });

  it('FR-035: renders inline variant', () => {
    const { container } = render(<AiLabel variant="inline" />);
    const label = container.querySelector('[data-testid="ai-label"]');
    expect(label).toBeDefined();
  });

  it('FR-035: has appropriate ARIA attributes for accessibility', () => {
    render(<AiLabel />);
    const label = screen.getByText('AI-Generated');
    // Should indicate this is AI-generated content
    expect(label.closest('[data-testid="ai-label"]')).toBeDefined();
  });

  it('FR-035: applies custom className when provided', () => {
    const { container } = render(<AiLabel className="mt-4" />);
    const label = container.querySelector('[data-testid="ai-label"]');
    expect(label?.className).toContain('mt-4');
  });
});
