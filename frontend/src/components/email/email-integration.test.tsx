import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/hooks/use-email-records', () => ({
  useUnmatchedEmails: vi.fn(),
  useLinkEmail: vi.fn(),
}));

vi.mock('@/hooks/use-accounts', () => ({
  useAccounts: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useUnmatchedEmails, useLinkEmail } from '@/hooks/use-email-records';
import { useAccounts } from '@/hooks/use-accounts';

import UnmatchedEmailsPage from '@/app/(authenticated)/admin/emails/unmatched/page';

const mockEmails = [
  {
    id: 'em-1',
    subject: 'Re: Product Samples',
    recipientEmail: 'unknown@example.com',
    direction: 'outbound' as const,
    status: 'sent' as const,
    sentAt: '2026-02-28T10:00:00Z',
    isLinked: false,
    contactId: null,
    accountId: null,
    bodyPreview: null,
    userId: 'u-1',
    tenantId: 't-1',
    openedAt: null,
    clickedAt: null,
    bouncedAt: null,
    createdAt: '2026-02-28T10:00:00Z',
  },
  {
    id: 'em-2',
    subject: 'Pricing Follow-up',
    recipientEmail: 'another@test.com',
    direction: 'inbound' as const,
    status: 'delivered' as const,
    sentAt: '2026-02-27T15:00:00Z',
    isLinked: false,
    contactId: null,
    accountId: null,
    bodyPreview: null,
    userId: 'u-1',
    tenantId: 't-1',
    openedAt: null,
    clickedAt: null,
    bouncedAt: null,
    createdAt: '2026-02-27T15:00:00Z',
  },
];

describe('FR-051: UnmatchedEmailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLinkEmail).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useLinkEmail>);
    vi.mocked(useAccounts).mockReturnValue({
      data: { data: [], pagination: { cursor: null, hasMore: false, total: 0 } },
      isLoading: false,
    } as unknown as ReturnType<typeof useAccounts>);
  });

  test('FR-051: renders page header', () => {
    vi.mocked(useUnmatchedEmails).mockReturnValue({
      data: {
        data: mockEmails,
        pagination: { cursor: null, hasMore: false, total: 2 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUnmatchedEmails>);

    render(<UnmatchedEmailsPage />);

    const headings = screen.getAllByText('Unmatched Emails');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  test('FR-051: shows loading state', () => {
    vi.mocked(useUnmatchedEmails).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUnmatchedEmails>);

    render(<UnmatchedEmailsPage />);

    expect(screen.queryByText('Re: Product Samples')).toBeNull();
  });

  test('FR-051: shows error state', () => {
    vi.mocked(useUnmatchedEmails).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUnmatchedEmails>);

    render(<UnmatchedEmailsPage />);

    expect(screen.getByText('Could not load unmatched emails. Please try again.')).toBeDefined();
  });

  test('AC-051b: displays unmatched emails with sender, subject, date', () => {
    vi.mocked(useUnmatchedEmails).mockReturnValue({
      data: {
        data: mockEmails,
        pagination: { cursor: null, hasMore: false, total: 2 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUnmatchedEmails>);

    render(<UnmatchedEmailsPage />);

    expect(screen.getByText('Re: Product Samples')).toBeDefined();
    expect(screen.getByText('Pricing Follow-up')).toBeDefined();
    expect(screen.getByText('To: unknown@example.com')).toBeDefined();
    expect(screen.getByText('To: another@test.com')).toBeDefined();
    expect(screen.getByText('2 unmatched emails')).toBeDefined();
  });

  test('AC-051b: shows link to account button', () => {
    vi.mocked(useUnmatchedEmails).mockReturnValue({
      data: {
        data: mockEmails,
        pagination: { cursor: null, hasMore: false, total: 2 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUnmatchedEmails>);

    render(<UnmatchedEmailsPage />);

    const linkButtons = screen.getAllByText('Link to Account');
    expect(linkButtons.length).toBe(2);
  });

  test('AC-051b: clicking link opens account search', () => {
    vi.mocked(useUnmatchedEmails).mockReturnValue({
      data: {
        data: mockEmails,
        pagination: { cursor: null, hasMore: false, total: 2 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUnmatchedEmails>);

    render(<UnmatchedEmailsPage />);

    const linkButtons = screen.getAllByText('Link to Account');
    fireEvent.click(linkButtons[0] as HTMLElement);

    expect(screen.getByPlaceholderText('Search accounts...')).toBeDefined();
  });

  test('AC-051b: account search shows results', () => {
    vi.mocked(useUnmatchedEmails).mockReturnValue({
      data: {
        data: mockEmails,
        pagination: { cursor: null, hasMore: false, total: 2 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUnmatchedEmails>);
    vi.mocked(useAccounts).mockReturnValue({
      data: {
        data: [{ id: 'acc-1', name: 'Acme Foods' }],
        pagination: { cursor: null, hasMore: false, total: 1 },
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useAccounts>);

    render(<UnmatchedEmailsPage />);

    const linkButtons = screen.getAllByText('Link to Account');
    fireEvent.click(linkButtons[0] as HTMLElement);

    const searchInput = screen.getByPlaceholderText('Search accounts...');
    fireEvent.change(searchInput, { target: { value: 'Acme' } });

    expect(screen.getByText('Acme Foods')).toBeDefined();
  });

  test('FR-051: shows empty state when no unmatched emails', () => {
    vi.mocked(useUnmatchedEmails).mockReturnValue({
      data: {
        data: [],
        pagination: { cursor: null, hasMore: false, total: 0 },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUnmatchedEmails>);

    render(<UnmatchedEmailsPage />);

    expect(screen.getByText('No unmatched emails')).toBeDefined();
  });
});
