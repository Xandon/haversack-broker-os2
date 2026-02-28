import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { EmailThread } from './email-thread';

import type { EmailRecord } from '@/hooks/use-emails';


function makeEmail(overrides: Partial<EmailRecord> = {}): EmailRecord {
  return {
    id: '1',
    direction: 'outbound',
    subject: 'Follow up on our meeting',
    bodyPreview: 'Thanks for taking the time to meet today.',
    fromAddress: 'rep@haversack.com',
    toAddresses: ['buyer@example.com'],
    ccAddresses: [],
    engagementStatus: 'sent',
    openedAt: null,
    clickedAt: null,
    bouncedAt: null,
    isMatched: true,
    createdAt: '2026-02-28T10:00:00.000Z',
    account: { id: 'acc-1', name: 'Acme Corp' },
    contact: null,
    ...overrides,
  };
}

describe('EmailThread', () => {
  it('FR-010: renders empty state when no emails', () => {
    render(<EmailThread emails={[]} />);
    expect(screen.getByText('No emails')).toBeInTheDocument();
  });

  it('FR-010: renders list of emails with subjects', () => {
    const emails = [
      makeEmail({ id: '1', subject: 'Follow up' }),
      makeEmail({ id: '2', subject: 'Order confirmation' }),
    ];
    render(<EmailThread emails={emails} />);
    expect(screen.getByText('Follow up')).toBeInTheDocument();
    expect(screen.getByText('Order confirmation')).toBeInTheDocument();
  });

  it('FR-010: shows direction badge (Sent/Received)', () => {
    render(<EmailThread emails={[makeEmail({ direction: 'outbound' })]} />);
    const sentElements = screen.getAllByText('Sent');
    expect(sentElements.length).toBeGreaterThanOrEqual(1);
  });

  it('FR-010: shows Received badge for inbound emails', () => {
    render(<EmailThread emails={[makeEmail({ direction: 'inbound' })]} />);
    expect(screen.getByText('Received')).toBeInTheDocument();
  });

  it('FR-010: displays engagement status icon', () => {
    render(<EmailThread emails={[makeEmail({ engagementStatus: 'opened' })]} />);
    expect(screen.getByText('Opened')).toBeInTheDocument();
  });

  it('FR-010: shows recipient for outbound emails', () => {
    render(
      <EmailThread
        emails={[makeEmail({ direction: 'outbound', toAddresses: ['buyer@example.com'] })]}
      />,
    );
    expect(screen.getByText('To: buyer@example.com')).toBeInTheDocument();
  });

  it('FR-010: shows sender for inbound emails', () => {
    render(
      <EmailThread
        emails={[makeEmail({ direction: 'inbound', fromAddress: 'buyer@example.com' })]}
      />,
    );
    expect(screen.getByText('From: buyer@example.com')).toBeInTheDocument();
  });

  it('FR-010: shows body preview', () => {
    render(<EmailThread emails={[makeEmail({ bodyPreview: 'Thanks for the meeting' })]} />);
    expect(screen.getByText('Thanks for the meeting')).toBeInTheDocument();
  });

  it('FR-010: shows Compose button when onComposeClick provided', () => {
    const onComposeClick = vi.fn();
    render(<EmailThread emails={[]} onComposeClick={onComposeClick} />);
    const btn = screen.getByText('Compose');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onComposeClick).toHaveBeenCalledOnce();
  });

  it('FR-010: hides Compose button when no onComposeClick', () => {
    render(<EmailThread emails={[]} />);
    expect(screen.queryByText('Compose')).not.toBeInTheDocument();
  });

  it('FR-010: handles email with no subject gracefully', () => {
    render(<EmailThread emails={[makeEmail({ subject: null })]} />);
    expect(screen.getByText('(No subject)')).toBeInTheDocument();
  });
});
