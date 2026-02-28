import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EmailDraftPanel } from './email-draft-panel';

const mockDraft = {
  subject: 'Follow-up: Q2 Product Catalog',
  body: 'Dear Jane,\n\nThank you for your continued partnership.',
  generatedAt: '2026-02-28T12:00:00Z',
};

describe('EmailDraftPanel', () => {
  it('FR-030: shows purpose input and generate button', () => {
    render(<EmailDraftPanel draft={null} isLoading={false} error={null} onGenerate={vi.fn()} />);
    expect(screen.getByLabelText('Email purpose')).toBeInTheDocument();
    expect(screen.getByText('Generate Draft')).toBeInTheDocument();
  });

  it('FR-030: displays AI-Generated badge on draft', () => {
    render(
      <EmailDraftPanel draft={mockDraft} isLoading={false} error={null} onGenerate={vi.fn()} />,
    );
    expect(screen.getByText('AI-Generated')).toBeInTheDocument();
  });

  it('FR-030: displays editable subject and body', () => {
    render(
      <EmailDraftPanel draft={mockDraft} isLoading={false} error={null} onGenerate={vi.fn()} />,
    );
    expect(screen.getByLabelText('Email subject')).toHaveValue('Follow-up: Q2 Product Catalog');
    expect(screen.getByLabelText('Email body')).toHaveValue(
      'Dear Jane,\n\nThank you for your continued partnership.',
    );
  });

  it('FR-030: calls onGenerate with purpose text', () => {
    const onGenerate = vi.fn();
    render(<EmailDraftPanel draft={null} isLoading={false} error={null} onGenerate={onGenerate} />);
    fireEvent.change(screen.getByLabelText('Email purpose'), {
      target: { value: 'Follow up on order' },
    });
    fireEvent.click(screen.getByText('Generate Draft'));
    expect(onGenerate).toHaveBeenCalledWith('Follow up on order');
  });

  it('FR-030: disables button when purpose is empty', () => {
    render(<EmailDraftPanel draft={null} isLoading={false} error={null} onGenerate={vi.fn()} />);
    expect(screen.getByText('Generate Draft')).toBeDisabled();
  });

  it('AC-030b: shows error message when AI service fails', () => {
    render(
      <EmailDraftPanel
        draft={null}
        isLoading={false}
        error={new Error('Service unavailable')}
        onGenerate={vi.fn()}
      />,
    );
    expect(screen.getByText(/AI service temporarily unavailable/)).toBeInTheDocument();
  });
});
