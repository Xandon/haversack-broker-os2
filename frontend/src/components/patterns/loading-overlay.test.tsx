import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingOverlay } from './loading-overlay';

describe('FR-031: LoadingOverlay composite pattern', () => {
  test('US3: renders children', () => {
    render(
      <LoadingOverlay isLoading={false}>
        <div>Content</div>
      </LoadingOverlay>,
    );
    expect(screen.getByText('Content')).toBeDefined();
  });

  test('US3: does not show overlay when not loading', () => {
    const { container } = render(
      <LoadingOverlay isLoading={false}>
        <div>Content</div>
      </LoadingOverlay>,
    );
    const overlay = container.querySelector('.absolute');
    expect(overlay).toBeNull();
  });

  test('US3: shows overlay with spinner when loading', () => {
    const { container } = render(
      <LoadingOverlay isLoading={true}>
        <div>Content</div>
      </LoadingOverlay>,
    );
    const overlay = container.querySelector('.absolute');
    expect(overlay).toBeDefined();
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeDefined();
  });

  test('US3: children remain visible under overlay', () => {
    render(
      <LoadingOverlay isLoading={true}>
        <div>Content</div>
      </LoadingOverlay>,
    );
    expect(screen.getByText('Content')).toBeDefined();
  });
});
