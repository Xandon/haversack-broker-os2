import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';
import { QueryProvider } from './query-provider';

function TestConsumer(): React.ReactElement {
  const client = useQueryClient();
  const defaults = client.getDefaultOptions();
  return (
    <div>
      <span data-testid="stale-time">{String(defaults.queries?.staleTime)}</span>
      <span data-testid="retry">{String(defaults.queries?.retry)}</span>
      <span data-testid="refetch">{String(defaults.queries?.refetchOnWindowFocus)}</span>
    </div>
  );
}

describe('QueryProvider', () => {
  it('renders children', () => {
    render(
      <QueryProvider>
        <div data-testid="child">Hello</div>
      </QueryProvider>,
    );
    expect(screen.getByTestId('child')).toBeDefined();
  });

  it('configures QueryClient with correct defaults', () => {
    render(
      <QueryProvider>
        <TestConsumer />
      </QueryProvider>,
    );
    expect(screen.getByTestId('stale-time').textContent).toBe('30000');
    expect(screen.getByTestId('retry').textContent).toBe('1');
    expect(screen.getByTestId('refetch').textContent).toBe('false');
  });
});
