import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { OpportunitiesTab } from './opportunities-tab';

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from '@/lib/api-client';

const mockApiClient = vi.mocked(apiClient);

function createWrapper(): React.ComponentType<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const MOCK_OPPORTUNITIES = {
  data: [
    {
      id: 'opp-1',
      name: 'New pasta line expansion',
      estimatedValue: 15000,
      probability: 60,
      weightedValue: 9000,
      expectedCloseDate: '2026-04-15',
      stage: 'proposal',
      closeReason: null,
      closedAt: null,
      accountId: 'acc-1',
      accountName: 'Pacific Bistro',
      repId: 'user-1',
      repName: 'Jane Doe',
      brands: [{ id: 'brand-1', name: 'Artisan Pasta Co' }],
      isActive: true,
      createdAt: '2026-02-20T10:00:00Z',
      updatedAt: '2026-02-26T14:00:00Z',
    },
    {
      id: 'opp-2',
      name: 'Olive oil distribution',
      estimatedValue: 8000,
      probability: 100,
      weightedValue: 8000,
      expectedCloseDate: '2026-02-01',
      stage: 'closed_won',
      closeReason: 'Deal signed',
      closedAt: '2026-02-01T10:00:00Z',
      accountId: 'acc-1',
      accountName: 'Pacific Bistro',
      repId: 'user-1',
      repName: 'Jane Doe',
      brands: [{ id: 'brand-2', name: 'Tuscan Olive Co' }],
      isActive: true,
      createdAt: '2026-01-10T10:00:00Z',
      updatedAt: '2026-02-01T10:00:00Z',
    },
  ],
  pagination: { cursor: null, hasMore: false, total: 2 },
};

describe('FR-016: OpportunitiesTab component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-016: renders opportunity cards', async () => {
    mockApiClient.mockResolvedValue(MOCK_OPPORTUNITIES);

    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(OpportunitiesTab, { accountId: 'acc-1' }),
      ),
    );

    const oppName = await screen.findByText('New pasta line expansion');
    expect(oppName).toBeDefined();
    expect(screen.getByText('Olive oil distribution')).toBeDefined();
  });

  test('FR-016: shows open and closed counts', async () => {
    mockApiClient.mockResolvedValue(MOCK_OPPORTUNITIES);

    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(OpportunitiesTab, { accountId: 'acc-1' }),
      ),
    );

    const count = await screen.findByText('1 open, 1 closed');
    expect(count).toBeDefined();
  });

  test('FR-016: shows weighted pipeline total', async () => {
    mockApiClient.mockResolvedValue(MOCK_OPPORTUNITIES);

    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(OpportunitiesTab, { accountId: 'acc-1' }),
      ),
    );

    // Only open opportunity (opp-1) contributes to weighted pipeline: $9,000
    const pipeline = await screen.findByText('Weighted pipeline: $9,000');
    expect(pipeline).toBeDefined();
  });

  test('FR-016: renders stage badges', async () => {
    mockApiClient.mockResolvedValue(MOCK_OPPORTUNITIES);

    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(OpportunitiesTab, { accountId: 'acc-1' }),
      ),
    );

    await screen.findByText('New pasta line expansion');
    expect(screen.getByText('Proposal')).toBeDefined();
    expect(screen.getByText('Closed Won')).toBeDefined();
  });

  test('FR-016: renders brand tags', async () => {
    mockApiClient.mockResolvedValue(MOCK_OPPORTUNITIES);

    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(OpportunitiesTab, { accountId: 'acc-1' }),
      ),
    );

    await screen.findByText('New pasta line expansion');
    expect(screen.getByText('Artisan Pasta Co')).toBeDefined();
    expect(screen.getByText('Tuscan Olive Co')).toBeDefined();
  });

  test('FR-016: shows empty state when no opportunities', async () => {
    mockApiClient.mockResolvedValue({
      data: [],
      pagination: { cursor: null, hasMore: false, total: 0 },
    });

    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(OpportunitiesTab, { accountId: 'acc-1' }),
      ),
    );

    const emptyState = await screen.findByText('No opportunities');
    expect(emptyState).toBeDefined();
  });

  test('FR-016: shows Closed section header', async () => {
    mockApiClient.mockResolvedValue(MOCK_OPPORTUNITIES);

    const Wrapper = createWrapper();
    render(
      createElement(Wrapper, null,
        createElement(OpportunitiesTab, { accountId: 'acc-1' }),
      ),
    );

    const closedHeader = await screen.findByText('Closed');
    expect(closedHeader).toBeDefined();
  });
});
