import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MeetingBriefPanel } from './meeting-brief-panel';

const mockBrief = {
  keyContacts: [
    { name: 'Jane Doe', title: 'Buyer', notes: 'Primary contact' },
    { name: 'John Smith', title: 'Manager', notes: '' },
  ],
  recentActivitySummary: 'Active engagement with 5 touchpoints this month.',
  orderTrends: 'Consistent monthly ordering averaging $4,500.',
  suggestedTalkingPoints: ['Discuss Q2 promotions', 'Review new product line'],
  generatedAt: '2026-02-28T12:00:00Z',
};

describe('MeetingBriefPanel', () => {
  it('FR-030: shows Prepare Meeting Brief button', () => {
    render(<MeetingBriefPanel brief={null} isLoading={false} error={null} onGenerate={vi.fn()} />);
    expect(screen.getByText('Prepare Meeting Brief')).toBeInTheDocument();
  });

  it('AC-030a: displays AI-Generated badge on content', () => {
    render(
      <MeetingBriefPanel brief={mockBrief} isLoading={false} error={null} onGenerate={vi.fn()} />,
    );
    expect(screen.getByText('AI-Generated')).toBeInTheDocument();
  });

  it('AC-030a: displays key contacts', () => {
    render(
      <MeetingBriefPanel brief={mockBrief} isLoading={false} error={null} onGenerate={vi.fn()} />,
    );
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('AC-030a: displays activity summary in editable textarea', () => {
    render(
      <MeetingBriefPanel brief={mockBrief} isLoading={false} error={null} onGenerate={vi.fn()} />,
    );
    const textarea = screen.getByLabelText('Activity summary');
    expect(textarea).toHaveValue('Active engagement with 5 touchpoints this month.');
  });

  it('AC-030a: displays suggested talking points', () => {
    render(
      <MeetingBriefPanel brief={mockBrief} isLoading={false} error={null} onGenerate={vi.fn()} />,
    );
    expect(screen.getByText('Discuss Q2 promotions')).toBeInTheDocument();
    expect(screen.getByText('Review new product line')).toBeInTheDocument();
  });

  it('AC-030a: calls onGenerate when button clicked', () => {
    const onGenerate = vi.fn();
    render(
      <MeetingBriefPanel brief={null} isLoading={false} error={null} onGenerate={onGenerate} />,
    );
    fireEvent.click(screen.getByText('Prepare Meeting Brief'));
    expect(onGenerate).toHaveBeenCalled();
  });

  it('FR-030: shows loading state with skeleton', () => {
    render(<MeetingBriefPanel brief={null} isLoading={true} error={null} onGenerate={vi.fn()} />);
    expect(screen.getByText('Generating...')).toBeInTheDocument();
  });

  it('AC-030b: shows error message when AI service fails', () => {
    render(
      <MeetingBriefPanel
        brief={null}
        isLoading={false}
        error={new Error('Service unavailable')}
        onGenerate={vi.fn()}
      />,
    );
    expect(screen.getByText(/AI service temporarily unavailable/)).toBeInTheDocument();
  });

  it('FR-030: shows empty state prompt when no brief', () => {
    render(<MeetingBriefPanel brief={null} isLoading={false} error={null} onGenerate={vi.fn()} />);
    expect(screen.getByText(/Click.*Prepare Meeting Brief.*to generate/)).toBeInTheDocument();
  });
});
