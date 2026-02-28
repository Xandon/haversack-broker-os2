import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MeetingBriefPanel } from './meeting-brief-panel';
import { EmailDraftPanel } from './email-draft-panel';
import { ActivitySummaryPanel } from './activity-summary-panel';

vi.mock('@/hooks/use-ai', () => ({
  useMeetingBrief: vi.fn(),
  useEmailDraft: vi.fn(),
  useActivitySummary: vi.fn(),
}));

import { useMeetingBrief, useEmailDraft, useActivitySummary } from '@/hooks/use-ai';

const mockContacts = [
  {
    id: 'con-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@coffee.com',
    phone: null,
    title: 'Manager',
    isPrimary: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'con-2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: null,
    phone: '555-1234',
    title: null,
    isPrimary: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

describe('FR-047: MeetingBriefPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-047: renders prepare button in initial state', () => {
    vi.mocked(useMeetingBrief).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useMeetingBrief>);

    render(<MeetingBriefPanel accountId="acc-1" />);

    expect(screen.getByText('Meeting Brief')).toBeDefined();
    expect(screen.getByText('Prepare Meeting Brief')).toBeDefined();
  });

  test('FR-047: shows loading state with AI-Generated badge', () => {
    vi.mocked(useMeetingBrief).mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useMeetingBrief>);

    const { container } = render(<MeetingBriefPanel accountId="acc-1" />);

    expect(screen.getByText('Generating...')).toBeDefined();
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('FR-047: shows error state with retry button', () => {
    vi.mocked(useMeetingBrief).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: true,
      data: undefined,
      error: new Error('Timeout'),
    } as unknown as ReturnType<typeof useMeetingBrief>);

    render(<MeetingBriefPanel accountId="acc-1" />);

    expect(
      screen.getByText('AI service temporarily unavailable — please try again in a few minutes'),
    ).toBeDefined();
    expect(screen.getByText('Retry')).toBeDefined();
  });

  test('FR-047: displays brief data with editable fields', () => {
    vi.mocked(useMeetingBrief).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      data: {
        account_id: 'acc-1',
        account_name: 'Coffee Co',
        ai_generated: true,
        ai_label: 'AI-Generated',
        brief: {
          key_contacts: [
            { name: 'John Doe', title: 'Manager', last_interaction: null, interaction_type: null },
          ],
          activity_summary: 'Active account with regular orders.',
          order_trends: {
            total_orders_12m: 10,
            total_revenue_12m: 50000,
            average_order_value: 5000,
            trend: 'increasing',
            top_products: [],
          },
          talking_points: ['Discuss new product line', 'Review Q1 orders'],
          health_score: 82,
          health_trend: 'improving',
        },
        editable: true,
        generated_at: '2026-02-28T00:00:00Z',
      },
    } as unknown as ReturnType<typeof useMeetingBrief>);

    render(<MeetingBriefPanel accountId="acc-1" />);

    expect(screen.getByText('John Doe')).toBeDefined();
    expect(screen.getByText('Regenerate')).toBeDefined();
    const summaryTextarea = screen.getByLabelText('Activity summary');
    expect((summaryTextarea as HTMLTextAreaElement).value).toBe(
      'Active account with regular orders.',
    );
  });

  test('FR-047: calls mutate on button click', () => {
    const mutateFn = vi.fn();
    vi.mocked(useMeetingBrief).mockReturnValue({
      mutate: mutateFn,
      isPending: false,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useMeetingBrief>);

    render(<MeetingBriefPanel accountId="acc-1" />);
    fireEvent.click(screen.getByText('Prepare Meeting Brief'));

    expect(mutateFn).toHaveBeenCalledWith({ accountId: 'acc-1' });
  });
});

describe('FR-047: EmailDraftPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-047: renders with contact selector and purpose', () => {
    vi.mocked(useEmailDraft).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useEmailDraft>);

    render(<EmailDraftPanel accountId="acc-1" contacts={mockContacts} />);

    expect(screen.getByText('Email Draft')).toBeDefined();
    expect(screen.getByLabelText('Contact')).toBeDefined();
    expect(screen.getByLabelText('Purpose')).toBeDefined();
    expect(screen.getByText('Generate Draft')).toBeDefined();
    // Only contacts with email should appear
    expect(screen.getByText('John Doe')).toBeDefined();
  });

  test('FR-047: disables generate when no contact selected', () => {
    vi.mocked(useEmailDraft).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useEmailDraft>);

    render(<EmailDraftPanel accountId="acc-1" contacts={mockContacts} />);

    const button = screen.getByText('Generate Draft').closest('button');
    expect(button?.disabled).toBe(true);
  });

  test('FR-047: shows draft content with editable fields', () => {
    vi.mocked(useEmailDraft).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      data: {
        ai_generated: true,
        ai_label: 'AI-Generated',
        draft: {
          to_email: 'john@coffee.com',
          to_name: 'John Doe',
          subject: 'Following up on our meeting',
          body: 'Hi John,\n\nThank you for meeting with us.',
          suggested_send_time: null,
        },
        editable: true,
        generated_at: '2026-02-28T00:00:00Z',
      },
    } as unknown as ReturnType<typeof useEmailDraft>);

    render(<EmailDraftPanel accountId="acc-1" contacts={mockContacts} />);

    const subjectInput = screen.getByLabelText('Subject') as HTMLInputElement;
    expect(subjectInput.value).toBe('Following up on our meeting');
    const bodyTextarea = screen.getByLabelText('Body') as HTMLTextAreaElement;
    expect(bodyTextarea.value).toContain('Hi John');
  });

  test('FR-047: shows error state', () => {
    vi.mocked(useEmailDraft).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: true,
      data: undefined,
      error: new Error('Service unavailable'),
    } as unknown as ReturnType<typeof useEmailDraft>);

    render(<EmailDraftPanel accountId="acc-1" contacts={mockContacts} />);

    expect(
      screen.getByText('AI service temporarily unavailable — please try again in a few minutes'),
    ).toBeDefined();
  });

  test('FR-047: shows message when no contacts have email', () => {
    vi.mocked(useEmailDraft).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useEmailDraft>);

    const noEmailContacts = [
      { ...mockContacts[1], id: 'con-2' },
    ];

    render(<EmailDraftPanel accountId="acc-1" contacts={noEmailContacts} />);

    expect(
      screen.getByText('No contacts with email addresses found. Add a contact with an email to use this feature.'),
    ).toBeDefined();
  });
});

describe('FR-047: ActivitySummaryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-047: renders generate button in initial state', () => {
    vi.mocked(useActivitySummary).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useActivitySummary>);

    render(<ActivitySummaryPanel accountId="acc-1" />);

    expect(screen.getByText('Activity Summary')).toBeDefined();
    expect(screen.getByText('Generate Summary')).toBeDefined();
  });

  test('FR-047: shows loading state', () => {
    vi.mocked(useActivitySummary).mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useActivitySummary>);

    const { container } = render(<ActivitySummaryPanel accountId="acc-1" />);

    expect(screen.getByText('Generating...')).toBeDefined();
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('FR-047: displays summary data with breakdown', () => {
    vi.mocked(useActivitySummary).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      data: {
        account_id: 'acc-1',
        account_name: 'Coffee Co',
        ai_generated: true,
        ai_label: 'AI-Generated',
        summary: {
          period: 'Aug 2025 — Feb 2026',
          total_activities: 12,
          activity_breakdown: { visits: 3, calls: 5, emails: 3, demos: 1 },
          narrative: 'Active engagement over the past 6 months.',
          key_events: ['Product demo in October', 'New PO in January'],
          engagement_assessment: 'High engagement level',
        },
        editable: true,
        generated_at: '2026-02-28T00:00:00Z',
      },
    } as unknown as ReturnType<typeof useActivitySummary>);

    render(<ActivitySummaryPanel accountId="acc-1" />);

    expect(screen.getByText('Visits')).toBeDefined();
    expect(screen.getByText('Calls')).toBeDefined();
    expect(screen.getByText('Emails')).toBeDefined();
    expect(screen.getByText('Demos')).toBeDefined();
    expect(screen.getByText('Product demo in October')).toBeDefined();
    expect(screen.getByText('High engagement level')).toBeDefined();
    const narrativeTextarea = screen.getByLabelText('Activity narrative');
    expect((narrativeTextarea as HTMLTextAreaElement).value).toBe(
      'Active engagement over the past 6 months.',
    );
  });

  test('FR-047: shows error with retry', () => {
    vi.mocked(useActivitySummary).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: true,
      data: undefined,
      error: new Error('Timeout'),
    } as unknown as ReturnType<typeof useActivitySummary>);

    render(<ActivitySummaryPanel accountId="acc-1" />);

    expect(
      screen.getByText('AI service temporarily unavailable — please try again in a few minutes'),
    ).toBeDefined();
    expect(screen.getByText('Retry')).toBeDefined();
  });

  test('FR-047: calls mutate with accountId and periodMonths', () => {
    const mutateFn = vi.fn();
    vi.mocked(useActivitySummary).mockReturnValue({
      mutate: mutateFn,
      isPending: false,
      isError: false,
      data: undefined,
    } as unknown as ReturnType<typeof useActivitySummary>);

    render(<ActivitySummaryPanel accountId="acc-1" />);
    fireEvent.click(screen.getByText('Generate Summary'));

    expect(mutateFn).toHaveBeenCalledWith({ accountId: 'acc-1', periodMonths: 6 });
  });
});
