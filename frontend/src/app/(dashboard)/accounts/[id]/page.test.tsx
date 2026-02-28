import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import AccountDetailPage from './page';

import { useAccount } from '@/hooks/use-accounts';
import { useGenerateMeetingBrief } from '@/hooks/use-ai';
import { useContacts } from '@/hooks/use-contacts';
import { useEmails } from '@/hooks/use-emails';
import { useOpportunities } from '@/hooks/use-opportunities';


vi.mock('@/hooks/use-accounts', () => ({
  useAccount: vi.fn(),
}));

vi.mock('@/hooks/use-contacts', () => ({
  useContacts: vi.fn(),
}));

vi.mock('@/hooks/use-emails', () => ({
  useEmails: vi.fn(),
}));

vi.mock('@/hooks/use-opportunities', () => ({
  useOpportunities: vi.fn(),
}));

vi.mock('@/hooks/use-ai', () => ({
  useGenerateMeetingBrief: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ id: 'test-id' })),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/components/accounts/account-form', () => ({
  AccountForm: ({ defaultValues }: { defaultValues: unknown; onSubmit: () => void }) => (
    <div data-testid="account-form" data-values={JSON.stringify(defaultValues)}>
      Account Form
    </div>
  ),
}));

vi.mock('@/components/accounts/contact-list', () => ({
  ContactList: () => <div data-testid="contact-list">Contact List</div>,
}));

vi.mock('@/components/ai/meeting-brief-panel', () => ({
  MeetingBriefPanel: () => <div data-testid="meeting-brief-panel">Meeting Brief Panel</div>,
}));

vi.mock('@/components/emails/email-thread', () => ({
  EmailThread: () => <div data-testid="email-thread">Email Thread</div>,
}));

vi.mock('@/components/shared/error-banner', () => ({
  ErrorBanner: ({ message }: { message: string }) => (
    <div role="alert">
      <p>{message}</p>
    </div>
  ),
}));

vi.mock('@/components/shared/empty-state', () => ({
  EmptyState: ({ title, description }: { title: string; description?: string }) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  ),
}));

vi.mock('@/components/shared/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} role="status" aria-label="Loading" />
  ),
  SkeletonTable: ({ rows }: { rows?: number }) => (
    <div data-testid="skeleton-table" data-rows={rows} role="status" aria-label="Loading" />
  ),
}));

const mockUseAccount = useAccount as ReturnType<typeof vi.fn>;
const mockUseContacts = useContacts as ReturnType<typeof vi.fn>;
const mockUseEmails = useEmails as ReturnType<typeof vi.fn>;
const mockUseOpportunities = useOpportunities as ReturnType<typeof vi.fn>;
const mockUseGenerateMeetingBrief = useGenerateMeetingBrief as ReturnType<typeof vi.fn>;

const mockAccount = {
  data: {
    id: '1',
    name: 'Pacific Bistro',
    accountType: 'restaurant',
    healthScore: 85,
    addressLine1: '123 Main',
    city: 'Portland',
    state: 'OR',
    zipCode: '97201',
    territoryId: 't1',
    territory: { name: 'Portland' },
  },
};

function setupDefaultMocks() {
  mockUseAccount.mockReturnValue({
    data: mockAccount,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  mockUseContacts.mockReturnValue({
    data: { data: [] },
    isLoading: false,
    error: null,
  });
  mockUseEmails.mockReturnValue({
    data: { data: [] },
    isLoading: false,
    error: null,
  });
  mockUseOpportunities.mockReturnValue({
    data: { data: [] },
    isLoading: false,
    error: null,
  });
  mockUseGenerateMeetingBrief.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    error: null,
    data: null,
    reset: vi.fn(),
  });
}

describe('AccountDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FR-P005: renders account header with name', () => {
    setupDefaultMocks();
    render(<AccountDetailPage />);

    expect(screen.getByRole('heading', { name: /pacific bistro/i })).toBeInTheDocument();
  });

  it('FR-P005: renders account type in header', () => {
    setupDefaultMocks();
    render(<AccountDetailPage />);

    expect(screen.getByText('restaurant')).toBeInTheDocument();
  });

  it('FR-P005: renders territory name in header', () => {
    setupDefaultMocks();
    render(<AccountDetailPage />);

    expect(screen.getByText('Portland')).toBeInTheDocument();
  });

  it('FR-P005: renders health score badge', () => {
    setupDefaultMocks();
    render(<AccountDetailPage />);

    expect(screen.getByText('Health: 85')).toBeInTheDocument();
  });

  it('FR-P005: shows skeleton when loading', () => {
    mockUseAccount.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });
    mockUseContacts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    mockUseEmails.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    mockUseOpportunities.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    mockUseGenerateMeetingBrief.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });

    render(<AccountDetailPage />);

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('FR-P005: shows error banner on error', () => {
    mockUseAccount.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Not found'),
      refetch: vi.fn(),
    });
    mockUseContacts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    mockUseEmails.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    mockUseOpportunities.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    mockUseGenerateMeetingBrief.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });

    render(<AccountDetailPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Account not found')).toBeInTheDocument();
  });

  it('FR-P005: shows "Back to accounts" link on error', () => {
    mockUseAccount.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Not found'),
      refetch: vi.fn(),
    });
    mockUseContacts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    mockUseEmails.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    mockUseOpportunities.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });
    mockUseGenerateMeetingBrief.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });

    render(<AccountDetailPage />);

    const backLink = screen.getByText('Back to accounts');
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest('a')).toHaveAttribute('href', '/accounts');
  });

  it('FR-P005: renders all five tabs', () => {
    setupDefaultMocks();
    render(<AccountDetailPage />);

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Contacts')).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Emails')).toBeInTheDocument();
  });

  it('FR-P005: Overview tab is active by default', () => {
    setupDefaultMocks();
    render(<AccountDetailPage />);

    const overviewTab = screen.getByText('Overview');
    expect(overviewTab).toHaveAttribute('aria-current', 'page');
  });

  it('FR-P005: renders AccountForm on Overview tab', () => {
    setupDefaultMocks();
    render(<AccountDetailPage />);

    expect(screen.getByTestId('account-form')).toBeInTheDocument();
  });

  it('FR-P005: renders MeetingBriefPanel on Overview tab', () => {
    setupDefaultMocks();
    render(<AccountDetailPage />);

    expect(screen.getByTestId('meeting-brief-panel')).toBeInTheDocument();
  });

  it('FR-P005: switching to Contacts tab shows contact content', () => {
    setupDefaultMocks();
    render(<AccountDetailPage />);

    const contactsTab = screen.getByText('Contacts');
    fireEvent.click(contactsTab);

    // With empty contacts, should show empty state
    expect(screen.getByText('No contacts yet')).toBeInTheDocument();
  });
});
