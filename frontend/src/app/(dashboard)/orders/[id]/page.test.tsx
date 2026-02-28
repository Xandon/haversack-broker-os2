import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import OrderDetailPage from './page';

import { useOrder } from '@/hooks/use-orders';


vi.mock('@/hooks/use-orders', () => ({
  useOrder: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ id: 'test-id' })),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
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
    <div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  ),
}));

vi.mock('@/components/shared/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div role="status" aria-label="Loading" className={className} />
  ),
  SkeletonTable: ({ rows }: { rows?: number }) => (
    <div role="status" aria-label="Loading table" data-rows={rows} />
  ),
}));

const mockUseOrder = useOrder as ReturnType<typeof vi.fn>;

const mockOrder = {
  data: {
    id: '1',
    orderNumber: 'ORD-001',
    status: 'confirmed',
    total: 1500,
    account: { name: 'Pacific Bistro' },
    lineItems: [
      {
        id: 'li1',
        product: { name: 'Organic Honey', sku: 'HON-001' },
        quantity: 5,
        unitPrice: 12.5,
        lineTotal: 62.5,
      },
    ],
  },
};

describe('OrderDetailPage', () => {
  it('FR-P008: renders order header with order number', () => {
    mockUseOrder.mockReturnValue({
      data: mockOrder,
      isLoading: false,
      error: null,
    });

    render(<OrderDetailPage />);

    expect(screen.getByRole('heading', { name: /order ord-001/i })).toBeInTheDocument();
  });

  it('FR-P008: renders order status and account name', () => {
    mockUseOrder.mockReturnValue({
      data: mockOrder,
      isLoading: false,
      error: null,
    });

    render(<OrderDetailPage />);

    expect(screen.getByText('confirmed')).toBeInTheDocument();
    expect(screen.getByText('Pacific Bistro')).toBeInTheDocument();
  });

  it('FR-P008: renders order total', () => {
    mockUseOrder.mockReturnValue({
      data: mockOrder,
      isLoading: false,
      error: null,
    });

    render(<OrderDetailPage />);

    expect(screen.getByText('$1,500')).toBeInTheDocument();
  });

  it('FR-P008: renders line item product details', () => {
    mockUseOrder.mockReturnValue({
      data: mockOrder,
      isLoading: false,
      error: null,
    });

    render(<OrderDetailPage />);

    expect(screen.getByText('Organic Honey')).toBeInTheDocument();
    expect(screen.getByText('HON-001')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('$12.50')).toBeInTheDocument();
    expect(screen.getByText('$62.50')).toBeInTheDocument();
  });

  it('FR-P008: shows skeleton when loading', () => {
    mockUseOrder.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<OrderDetailPage />);

    const loadingElements = screen.getAllByRole('status', { name: /loading/i });
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('FR-P008: shows "Order not found" on error', () => {
    mockUseOrder.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Not found'),
    });

    render(<OrderDetailPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Order not found')).toBeInTheDocument();
  });

  it('FR-P008: shows "Back to orders" link on error', () => {
    mockUseOrder.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Not found'),
    });

    render(<OrderDetailPage />);

    const link = screen.getByRole('link', { name: /back to orders/i });
    expect(link).toHaveAttribute('href', '/orders');
  });

  it('FR-P008: shows empty line items state when order has no line items', () => {
    mockUseOrder.mockReturnValue({
      data: {
        data: {
          id: '2',
          orderNumber: 'ORD-002',
          status: 'draft',
          total: 0,
          account: { name: 'Empty Cafe' },
          lineItems: [],
        },
      },
      isLoading: false,
      error: null,
    });

    render(<OrderDetailPage />);

    expect(screen.getByText('No line items')).toBeInTheDocument();
    expect(screen.getByText('This order has no line items')).toBeInTheDocument();
  });
});
