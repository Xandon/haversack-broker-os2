import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OpportunityForm } from './opportunity-form';

describe('FR-043: OpportunityForm', () => {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('FR-043: renders create mode with correct title', () => {
    render(
      <OpportunityForm mode="create" onSubmit={onSubmit} onCancel={onCancel} />,
    );

    expect(screen.getByText('New Opportunity')).toBeDefined();
    expect(screen.getByText('Create Opportunity')).toBeDefined();
  });

  test('FR-043: renders edit mode with correct title', () => {
    render(
      <OpportunityForm
        mode="edit"
        defaultValues={{ name: 'Existing Opp', estimatedValue: 50000 }}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText('Edit Opportunity')).toBeDefined();
    expect(screen.getByText('Save Changes')).toBeDefined();
  });

  test('FR-043: renders required form fields', () => {
    render(
      <OpportunityForm mode="create" onSubmit={onSubmit} onCancel={onCancel} />,
    );

    expect(screen.getByLabelText(/Name/)).toBeDefined();
    expect(screen.getByLabelText(/Estimated Value/)).toBeDefined();
    expect(screen.getByLabelText(/Expected Close Date/)).toBeDefined();
    expect(screen.getByLabelText(/Stage/)).toBeDefined();
    expect(screen.getByLabelText(/Probability/)).toBeDefined();
  });

  test('FR-043: shows stage select with pipeline options', () => {
    render(
      <OpportunityForm mode="create" onSubmit={onSubmit} onCancel={onCancel} />,
    );

    const stageSelect = screen.getByLabelText(/Stage/);
    expect(stageSelect).toBeDefined();
    // Check that stage options are present
    const options = stageSelect.querySelectorAll('option');
    expect(options.length).toBe(4); // prospect, qualified, proposal, negotiation
  });

  test('FR-043: shows account ID field only in create mode', () => {
    const { rerender } = render(
      <OpportunityForm mode="create" onSubmit={onSubmit} onCancel={onCancel} />,
    );

    expect(screen.getByLabelText(/Account ID/)).toBeDefined();

    rerender(
      <OpportunityForm mode="edit" onSubmit={onSubmit} onCancel={onCancel} />,
    );

    expect(screen.queryByLabelText(/Account ID/)).toBeNull();
  });

  test('FR-043: cancel button calls onCancel', () => {
    render(
      <OpportunityForm mode="create" onSubmit={onSubmit} onCancel={onCancel} />,
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  test('FR-043: shows Saving... when isSubmitting', () => {
    render(
      <OpportunityForm
        mode="create"
        onSubmit={onSubmit}
        onCancel={onCancel}
        isSubmitting={true}
      />,
    );

    expect(screen.getByText('Saving...')).toBeDefined();
  });
});
