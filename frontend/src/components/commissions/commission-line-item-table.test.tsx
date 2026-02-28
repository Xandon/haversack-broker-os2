import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CommissionLineItemTable } from './commission-line-item-table';

const mockLineItems = [
  {
    id: 'c1',
    repId: 'rep-1',
    orderId: 'ord-123',
    orderItemId: 'oi-1',
    brandId: 'brand-1',
    period: '2026-03',
    lineTotal: 12000,
    baseRate: 10,
    territoryModifier: 1.0,
    volumeTierAdjustment: 1,
    effectiveRate: 11,
    amount: 1320,
    status: 'pending',
    createdAt: '2026-03-15',
    brand: { id: 'brand-1', name: 'Mountain Meadow Farms' },
    order: { id: 'ord-123', orderNumber: 'ORD-001' },
  },
  {
    id: 'c2',
    repId: 'rep-1',
    orderId: 'ord-456',
    orderItemId: 'oi-2',
    brandId: 'brand-2',
    period: '2026-03',
    lineTotal: 8000,
    baseRate: 12,
    territoryModifier: 1.0,
    volumeTierAdjustment: 0,
    effectiveRate: 12,
    amount: 960,
    status: 'disputed',
    createdAt: '2026-03-20',
    brand: { id: 'brand-2', name: 'Pacific Preserves' },
    order: { id: 'ord-456', orderNumber: 'ORD-002' },
  },
];

describe('CommissionLineItemTable', () => {
  it('AC-020a: displays order number and brand name', () => {
    render(<CommissionLineItemTable lineItems={mockLineItems} />);
    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.getByText('Mountain Meadow Farms')).toBeInTheDocument();
  });

  it('AC-020a: displays line total and commission amount', () => {
    render(<CommissionLineItemTable lineItems={mockLineItems} />);
    expect(screen.getByText('$12,000.00')).toBeInTheDocument();
    expect(screen.getByText('$1,320.00')).toBeInTheDocument();
  });

  it('AC-020a: displays effective commission rate', () => {
    render(<CommissionLineItemTable lineItems={mockLineItems} />);
    expect(screen.getByText('11%')).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();
  });

  it('FR-021: displays status badges', () => {
    render(<CommissionLineItemTable lineItems={mockLineItems} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Disputed')).toBeInTheDocument();
  });

  it('FR-021: highlights disputed rows with red background', () => {
    const { container } = render(<CommissionLineItemTable lineItems={mockLineItems} />);
    const rows = container.querySelectorAll('tr');
    // The disputed row (index 2 including header) should have bg-red-50
    const disputedRow = rows[2];
    expect(disputedRow.className).toContain('bg-red-50');
  });

  it('FR-021: shows actions when showActions is true', () => {
    render(
      <CommissionLineItemTable
        lineItems={mockLineItems}
        showActions={true}
        onApprove={vi.fn()}
        onDispute={vi.fn()}
      />,
    );
    // Pending item should have Approve and Dispute buttons
    expect(screen.getByText('Approve')).toBeInTheDocument();
  });

  it('FR-021: shows empty state when no line items', () => {
    render(<CommissionLineItemTable lineItems={[]} />);
    expect(screen.getByText('No commissions calculated for this period')).toBeInTheDocument();
  });

  it('FR-021: renders table header columns', () => {
    render(<CommissionLineItemTable lineItems={mockLineItems} />);
    expect(screen.getByText('Order')).toBeInTheDocument();
    expect(screen.getByText('Brand')).toBeInTheDocument();
    expect(screen.getByText('Line Total')).toBeInTheDocument();
    expect(screen.getByText('Rate')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });
});
