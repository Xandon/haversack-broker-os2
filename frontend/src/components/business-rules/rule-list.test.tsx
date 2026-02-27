import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuleList } from './rule-list';
import type { BusinessRule } from '@/hooks/use-business-rules';

function makeRule(overrides: Partial<BusinessRule> = {}): BusinessRule {
  return {
    id: '1',
    tenantId: 'tenant-1',
    name: 'Churn Alert',
    description: 'Alerts when health score drops',
    entityType: 'Account',
    conditions: { logic: 'AND', conditions: [{ field: 'healthScore', operator: 'lt', value: 30 }] },
    actions: [{ type: 'send_notification', config: { recipient: 'assignedRep', title: 'Alert' } }],
    priority: 100,
    status: 'active',
    lastFiredAt: null,
    errorMessage: null,
    createdBy: 'user-1',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('RuleList', () => {
  const defaultProps = {
    rules: undefined as BusinessRule[] | undefined,
    isLoading: false,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggleStatus: vi.fn(),
  };

  it('renders loading skeletons', () => {
    const { container } = render(<RuleList {...defaultProps} isLoading />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no rules', () => {
    render(<RuleList {...defaultProps} rules={[]} />);
    expect(screen.getByText('No business rules configured yet.')).toBeDefined();
  });

  it('renders empty state when rules is undefined and not loading', () => {
    render(<RuleList {...defaultProps} rules={undefined} />);
    expect(screen.getByText('No business rules configured yet.')).toBeDefined();
  });

  it('renders rule name and status', () => {
    const rules = [makeRule()];
    render(<RuleList {...defaultProps} rules={rules} />);
    expect(screen.getByText('Churn Alert')).toBeDefined();
    expect(screen.getByText('active')).toBeDefined();
  });

  it('renders rule metadata: entity type, priority, actions', () => {
    const rules = [makeRule()];
    render(<RuleList {...defaultProps} rules={rules} />);
    expect(screen.getByText('Entity: Account')).toBeDefined();
    expect(screen.getByText('Priority: 100')).toBeDefined();
    expect(screen.getByText('Actions: send notification')).toBeDefined();
  });

  it('renders description when present', () => {
    const rules = [makeRule({ description: 'Test description' })];
    render(<RuleList {...defaultProps} rules={rules} />);
    expect(screen.getByText('Test description')).toBeDefined();
  });

  it('renders error message when present', () => {
    const rules = [makeRule({ status: 'error', errorMessage: 'Something broke' })];
    render(<RuleList {...defaultProps} rules={rules} />);
    expect(screen.getByText('Error: Something broke')).toBeDefined();
  });

  it('renders last fired date when present', () => {
    const rules = [makeRule({ lastFiredAt: '2025-06-15T10:00:00Z' })];
    render(<RuleList {...defaultProps} rules={rules} />);
    expect(screen.getByText(/Last fired:/)).toBeDefined();
  });

  it('calls onEdit when Edit button clicked', async () => {
    const onEdit = vi.fn();
    const rules = [makeRule({ id: 'rule-42' })];
    render(<RuleList {...defaultProps} rules={rules} onEdit={onEdit} />);
    await userEvent.click(screen.getByLabelText('Edit rule Churn Alert'));
    expect(onEdit).toHaveBeenCalledWith('rule-42');
  });

  it('calls onDelete when Delete button clicked', async () => {
    const onDelete = vi.fn();
    const rules = [makeRule({ id: 'rule-42' })];
    render(<RuleList {...defaultProps} rules={rules} onDelete={onDelete} />);
    await userEvent.click(screen.getByLabelText('Delete rule Churn Alert'));
    expect(onDelete).toHaveBeenCalledWith('rule-42');
  });

  it('calls onToggleStatus with inactive when active rule toggled', async () => {
    const onToggleStatus = vi.fn();
    const rules = [makeRule({ id: 'rule-42', status: 'active' })];
    render(<RuleList {...defaultProps} rules={rules} onToggleStatus={onToggleStatus} />);
    await userEvent.click(screen.getByLabelText('Deactivate rule Churn Alert'));
    expect(onToggleStatus).toHaveBeenCalledWith('rule-42', 'inactive');
  });

  it('calls onToggleStatus with active when inactive rule toggled', async () => {
    const onToggleStatus = vi.fn();
    const rules = [makeRule({ id: 'rule-42', status: 'inactive' })];
    render(<RuleList {...defaultProps} rules={rules} onToggleStatus={onToggleStatus} />);
    await userEvent.click(screen.getByLabelText('Activate rule Churn Alert'));
    expect(onToggleStatus).toHaveBeenCalledWith('rule-42', 'active');
  });

  it('has 44px minimum touch targets on action buttons', () => {
    const rules = [makeRule()];
    render(<RuleList {...defaultProps} rules={rules} />);
    const editBtn = screen.getByLabelText('Edit rule Churn Alert');
    expect(editBtn.className).toContain('min-h-[44px]');
    expect(editBtn.className).toContain('min-w-[44px]');
  });

  it('renders multiple rules', () => {
    const rules = [
      makeRule({ id: '1', name: 'Rule A' }),
      makeRule({ id: '2', name: 'Rule B' }),
    ];
    render(<RuleList {...defaultProps} rules={rules} />);
    expect(screen.getByText('Rule A')).toBeDefined();
    expect(screen.getByText('Rule B')).toBeDefined();
  });
});
