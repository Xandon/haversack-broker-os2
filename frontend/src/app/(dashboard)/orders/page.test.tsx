import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import OrderListPage from './page';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockUseOrders = vi.fn();

vi.mock('@/hooks/use-orders', () => ({
  useOrders: (...args: unknown[]) => mockUseOrders(...args),
}));

const mockOrders = {
  data: [
    {
      id: 'o1',
      orderNumber: 'ORD-001',
      accountId: 'a1',
      assignedRepId: 'r1',
      status: 'confirmed',
      orderType: 'broker',
      subtotal: 900,
      tax: 100,
      total: 1000,
      createdAt: '2026-02-15T10:30:00Z',
      account: { id: 'a1', name: 'Pacific Bistro' },
    },
    {
      id: 'o2',
      orderNumber: 'ORD-002',
      accountId: 'a2',
      assignedRepId: 'r2',
      status: 'draft',
      orderType: 'wholesale',
      subtotal: 2400,
      tax: 100,
      total: 2500,
      createdAt: '2026-02-20T14:00:00Z',
      account: { id: 'a2', name: 'Mountain Market' },
    },
  ],
  total: 2,
  page: 1,
  limit: 20,
};

describe('OrderListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FR-P006: renders "Orders" heading and "Create Order" link', () => {
    mockUseOrders.mockReturnValue({
      data: mockOrders,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<OrderListPage />);

    expect(screen.getByRole('heading', { name: /orders/i })).toBeInTheDocument();
    const createLink = screen.getByRole('link', { name: /create order/i });
    expect(createLink).toHaveAttribute('href', '/orders/new');
  });

  it('FR-P006: renders status filter chips', () => {
    mockUseOrders.mockReturnValue({
      data: mockOrders,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<OrderListPage />);

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Draft' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pending' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Shipped' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delivered' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelled' })).toBeInTheDocument();
  });

  it('FR-P006: shows skeleton table when loading', () => {
    mockUseOrders.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<OrderListPage />);

    const skeletons = screen.getAllByRole('status');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('FR-P006: shows error banner when request fails', () => {
    mockUseOrders.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Server error'),
      refetch: vi.fn(),
    });

    render(<OrderListPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Unable to load orders')).toBeInTheDocument();
  });

  it('FR-P006: error banner retry button calls refetch', () => {
    const mockRefetch = vi.fn();
    mockUseOrders.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('fail'),
      refetch: mockRefetch,
    });

    render(<OrderListPage />);

    screen.getByText('Retry').click();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('FR-P006: shows empty state when no orders exist', () => {
    mockUseOrders.mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 20 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<OrderListPage />);

    expect(screen.getByText('No orders found')).toBeInTheDocument();
    expect(screen.getByText('Create your first order')).toBeInTheDocument();
    // Two "Create Order" links: one in the header and one in the empty state action
    const createLinks = screen.getAllByRole('link', { name: /create order/i });
    expect(createLinks).toHaveLength(2);
    createLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/orders/new');
    });
  });

  it('FR-P006: renders order rows with all columns on success', () => {
    mockUseOrders.mockReturnValue({
      data: mockOrders,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<OrderListPage />);

    // Table headers
    expect(screen.getByText('Order #')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();

    // First order row
    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.getByText('Pacific Bistro')).toBeInTheDocument();
    expect(screen.getByText('confirmed')).toBeInTheDocument();

    // Second order row
    expect(screen.getByText('ORD-002')).toBeInTheDocument();
    expect(screen.getByText('Mountain Market')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
  });

  it('FR-P006: order number links to order detail page', () => {
    mockUseOrders.mockReturnValue({
      data: mockOrders,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<OrderListPage />);

    const link = screen.getByRole('link', { name: 'ORD-001' });
    expect(link).toHaveAttribute('href', '/orders/o1');
  });

  it('FR-P006: shows pagination info with order count', () => {
    mockUseOrders.mockReturnValue({
      data: mockOrders,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<OrderListPage />);

    expect(screen.getByText(/showing 2 of 2 orders/i)).toBeInTheDocument();
  });

  it('FR-P006: Previous button is disabled on first page', () => {
    mockUseOrders.mockReturnValue({
      data: mockOrders,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<OrderListPage />);

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  it('FR-P006: Next button is disabled when fewer results than limit', () => {
    mockUseOrders.mockReturnValue({
      data: mockOrders,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<OrderListPage />);

    // data.data.length (2) < 20, so Next should be disabled
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('FR-P006: clicking a status chip updates the filter and resets page', async () => {
    mockUseOrders.mockReturnValue({
      data: mockOrders,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    const user = userEvent.setup();

    render(<OrderListPage />);

    // Initially called with status=undefined (all)
    expect(mockUseOrders).toHaveBeenCalledWith(
      expect.objectContaining({ status: undefined, page: 1 }),
    );

    await user.click(screen.getByRole('button', { name: 'Confirmed' }));

    expect(mockUseOrders).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'confirmed', page: 1 }),
    );
  });

  it('FR-P006: clicking "All" chip clears the status filter', async () => {
    mockUseOrders.mockReturnValue({
      data: mockOrders,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    const user = userEvent.setup();

    render(<OrderListPage />);

    // Click a specific status first
    await user.click(screen.getByRole('button', { name: 'Shipped' }));
    // Then click All
    await user.click(screen.getByRole('button', { name: 'All' }));

    const lastCall = mockUseOrders.mock.calls[mockUseOrders.mock.calls.length - 1];
    expect(lastCall[0]).toEqual(expect.objectContaining({ status: undefined }));
  });

  it('FR-P006: shows empty state when data is null', () => {
    mockUseOrders.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<OrderListPage />);

    expect(screen.getByText('No orders found')).toBeInTheDocument();
  });
});
