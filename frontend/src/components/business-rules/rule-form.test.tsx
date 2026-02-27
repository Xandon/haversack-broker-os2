import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuleForm } from './rule-form';

describe('RuleForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isSubmitting: false,
  };

  it('renders all form fields', () => {
    render(<RuleForm {...defaultProps} />);
    expect(screen.getByLabelText('Name')).toBeDefined();
    expect(screen.getByLabelText('Entity Type')).toBeDefined();
    expect(screen.getByLabelText('Description')).toBeDefined();
    expect(screen.getByLabelText('Priority (1-1000)')).toBeDefined();
  });

  it('renders default submit label', () => {
    render(<RuleForm {...defaultProps} />);
    expect(screen.getByText('Create Rule')).toBeDefined();
  });

  it('renders custom submit label', () => {
    render(<RuleForm {...defaultProps} submitLabel="Update Rule" />);
    expect(screen.getByText('Update Rule')).toBeDefined();
  });

  it('shows validation error when name is empty', async () => {
    const onSubmit = vi.fn();
    render(<RuleForm {...defaultProps} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByText('Create Rule'));
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Rule name is required')).toBeDefined();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error for invalid priority', async () => {
    const onSubmit = vi.fn();
    render(<RuleForm {...defaultProps} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Name'), 'Test Rule');
    const priorityInput = screen.getByLabelText('Priority (1-1000)');
    fireEvent.change(priorityInput, { target: { value: '' } });
    await userEvent.click(screen.getByText('Create Rule'));

    expect(screen.getByText('Priority must be between 1 and 1000')).toBeDefined();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with form values when valid', async () => {
    const onSubmit = vi.fn();
    render(<RuleForm {...defaultProps} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Name'), 'Churn Alert');
    await userEvent.click(screen.getByText('Create Rule'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const call = onSubmit.mock.calls[0][0];
    expect(call.name).toBe('Churn Alert');
    expect(call.entityType).toBe('Account');
    expect(call.priority).toBe(100);
    expect(call.conditions).toBeDefined();
    expect(call.actions).toBeDefined();
    expect(call.actions.length).toBeGreaterThan(0);
  });

  it('populates initial values when provided', () => {
    render(
      <RuleForm
        {...defaultProps}
        initialValues={{
          name: 'Existing Rule',
          description: 'A description',
          entityType: 'Order',
          priority: 50,
        }}
      />,
    );

    expect(screen.getByLabelText<HTMLInputElement>('Name').value).toBe('Existing Rule');
    expect(screen.getByLabelText<HTMLInputElement>('Description').value).toBe('A description');
    expect(screen.getByLabelText<HTMLSelectElement>('Entity Type').value).toBe('Order');
    expect(screen.getByLabelText<HTMLInputElement>('Priority (1-1000)').value).toBe('50');
  });

  it('calls onCancel when Cancel button clicked', async () => {
    const onCancel = vi.fn();
    render(<RuleForm {...defaultProps} onCancel={onCancel} />);
    await userEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables submit button when isSubmitting is true', () => {
    render(<RuleForm {...defaultProps} isSubmitting />);
    const submitBtn = screen.getByText('Saving...');
    expect(submitBtn).toBeDefined();
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders error with role="alert" and aria-live', async () => {
    render(<RuleForm {...defaultProps} />);
    await userEvent.click(screen.getByText('Create Rule'));
    const alert = screen.getByRole('alert');
    expect(alert.getAttribute('aria-live')).toBe('polite');
  });

  it('has 44px minimum touch targets on buttons', () => {
    render(<RuleForm {...defaultProps} />);
    const cancelBtn = screen.getByText('Cancel');
    expect(cancelBtn.className).toContain('min-h-[44px]');
    const submitBtn = screen.getByText('Create Rule');
    expect(submitBtn.className).toContain('min-h-[44px]');
  });

  it('renders condition and action builder sections', () => {
    render(<RuleForm {...defaultProps} />);
    expect(screen.getByText('IF (Conditions)')).toBeDefined();
    // "THEN (Actions)" appears in both the card title and the ActionBuilder label
    expect(screen.getAllByText('THEN (Actions)').length).toBeGreaterThanOrEqual(1);
  });

  it('trims name and description before submitting', async () => {
    const onSubmit = vi.fn();
    render(<RuleForm {...defaultProps} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Name'), '  My Rule  ');
    await userEvent.type(screen.getByLabelText('Description'), '  desc  ');
    await userEvent.click(screen.getByText('Create Rule'));

    expect(onSubmit.mock.calls[0][0].name).toBe('My Rule');
    expect(onSubmit.mock.calls[0][0].description).toBe('desc');
  });
});
