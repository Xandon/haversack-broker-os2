import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/activities',
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from '@/lib/api-client';

const mockApiClient = vi.mocked(apiClient);

// Import page component dynamically to allow mocks to be set up first
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let ActivitiesPage: typeof import('@/app/(authenticated)/activities/page').default;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import('@/app/(authenticated)/activities/page');
  ActivitiesPage = mod.default;
});

const MOCK_ACCOUNTS = {
  data: [
    { id: 'acc-1', name: 'Pacific Bistro', accountType: 'restaurant', territoryId: 't1', territory: { id: 't1', name: 'Portland' }, healthScore: 85, updatedAt: '2026-02-26T10:00:00Z' },
    { id: 'acc-2', name: 'Mountain Deli', accountType: 'retail', territoryId: 't1', territory: { id: 't1', name: 'Portland' }, healthScore: 72, updatedAt: '2026-02-25T10:00:00Z' },
  ],
  pagination: { cursor: null, hasMore: false, total: 2 },
};

const MOCK_ACTIVITIES = {
  data: [
    {
      id: 'act-1',
      tenantId: 'tenant-1',
      accountId: 'acc-1',
      userId: 'user-1',
      type: 'visit',
      notes: 'Met with purchasing team',
      occurredAt: '2026-02-26T14:00:00Z',
      durationMinutes: 45,
      version: 1,
      demos: [],
      createdAt: '2026-02-26T14:00:00Z',
      updatedAt: '2026-02-26T14:00:00Z',
    },
    {
      id: 'act-2',
      tenantId: 'tenant-1',
      accountId: 'acc-1',
      userId: 'user-1',
      type: 'demo',
      notes: 'Product sampling session',
      occurredAt: '2026-02-25T10:00:00Z',
      durationMinutes: 30,
      version: 1,
      demos: [{ id: 'd1', productId: 'p1', quantitySampled: 5, buyerFeedback: 'Great', outcome: 'positive' }],
      createdAt: '2026-02-25T10:00:00Z',
      updatedAt: '2026-02-25T10:00:00Z',
    },
  ],
  pagination: { cursor: null, hasMore: false, total: 2 },
};

function createWrapper(): React.ComponentType<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('FR-036: ActivitiesPage', () => {
  test('FR-036: renders page header', async () => {
    mockApiClient.mockResolvedValue(MOCK_ACCOUNTS);

    const Wrapper = createWrapper();
    render(createElement(Wrapper, null, createElement(ActivitiesPage)));

    const header = await screen.findByText('Activities');
    expect(header).toBeDefined();
  });

  test('FR-036: renders account selector with accounts', async () => {
    mockApiClient.mockResolvedValue(MOCK_ACCOUNTS);

    const Wrapper = createWrapper();
    render(createElement(Wrapper, null, createElement(ActivitiesPage)));

    const option = await screen.findByText('Pacific Bistro');
    expect(option).toBeDefined();
    expect(screen.getByText('Mountain Deli')).toBeDefined();
  });

  test('FR-036: shows empty state when no account selected', async () => {
    mockApiClient.mockResolvedValue(MOCK_ACCOUNTS);

    const Wrapper = createWrapper();
    render(createElement(Wrapper, null, createElement(ActivitiesPage)));

    const emptyState = await screen.findByText('Select an account');
    expect(emptyState).toBeDefined();
  });

  test('FR-036: shows activities when account is selected', async () => {
    // First call returns accounts, subsequent calls return activities
    mockApiClient
      .mockResolvedValueOnce(MOCK_ACCOUNTS)
      .mockResolvedValue(MOCK_ACTIVITIES);

    const Wrapper = createWrapper();
    render(createElement(Wrapper, null, createElement(ActivitiesPage)));

    // Wait for accounts to load
    await screen.findByText('Pacific Bistro');

    // Select an account
    const select = screen.getByLabelText('Select account');
    fireEvent.change(select, { target: { value: 'acc-1' } });

    // Wait for activities to load
    const notes = await screen.findByText('Showing 2 of 2 activities');
    expect(notes).toBeDefined();
  });

  test('FR-036: shows Select an account prompt text', async () => {
    mockApiClient.mockResolvedValue(MOCK_ACCOUNTS);

    const Wrapper = createWrapper();
    render(createElement(Wrapper, null, createElement(ActivitiesPage)));

    const prompt = await screen.findByText('Select an account');
    expect(prompt).toBeDefined();
  });
});
