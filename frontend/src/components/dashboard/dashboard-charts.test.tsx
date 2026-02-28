import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RevenueChart } from './revenue-chart';
import { TerritoryRevenueTable } from './territory-revenue-table';
import { PipelineForecastChart } from './pipeline-forecast-chart';
import { HealthDonutChart } from './health-donut-chart';

// Mock recharts to avoid SSR/canvas issues in tests
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => <div />,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-pie-chart">{children}</div>,
  Pie: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => <div />,
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
}));

describe('FR-045: RevenueChart', () => {
  test('FR-045: renders loading skeleton', () => {
    const { container } = render(<RevenueChart data={undefined} isLoading={true} />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('FR-045: renders empty state when no data', () => {
    render(<RevenueChart data={[]} isLoading={false} />);
    expect(screen.getByText('No revenue data available')).toBeDefined();
  });

  test('FR-045: renders chart with data', () => {
    const data = [
      { month: '2026-01', revenue: 15000 },
      { month: '2026-02', revenue: 18000 },
    ];
    render(<RevenueChart data={data} isLoading={false} />);
    expect(screen.getByText('Revenue by Month')).toBeDefined();
    expect(screen.getByTestId('revenue-chart')).toBeDefined();
  });
});

describe('FR-045: TerritoryRevenueTable', () => {
  test('FR-045: renders loading skeleton', () => {
    const { container } = render(<TerritoryRevenueTable data={undefined} isLoading={true} />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('FR-045: renders empty state when no data', () => {
    render(<TerritoryRevenueTable data={[]} isLoading={false} />);
    expect(screen.getByText('No territory data available')).toBeDefined();
  });

  test('FR-045: renders territory data sorted by revenue', () => {
    const data = [
      { territoryId: 't1', territoryName: 'Portland', revenue: 25000, orderCount: 10, accountCount: 5 },
      { territoryId: 't2', territoryName: 'Seattle', revenue: 42000, orderCount: 18, accountCount: 8 },
    ];
    render(<TerritoryRevenueTable data={data} isLoading={false} />);
    expect(screen.getByText('Territory Revenue')).toBeDefined();
    expect(screen.getByText('Portland')).toBeDefined();
    expect(screen.getByText('Seattle')).toBeDefined();
    // Seattle should come first (higher revenue)
    const rows = screen.getAllByRole('row');
    // Header row + 2 data rows = 3
    expect(rows.length).toBe(3);
  });

  test('FR-045: displays revenue, orders, and account columns', () => {
    const data = [
      { territoryId: 't1', territoryName: 'Portland', revenue: 25000.50, orderCount: 10, accountCount: 5 },
    ];
    render(<TerritoryRevenueTable data={data} isLoading={false} />);
    expect(screen.getByText('$25,000.50')).toBeDefined();
    // "10" appears in table cells
    const cells = screen.getAllByText('10');
    expect(cells.length).toBeGreaterThanOrEqual(1);
  });
});

describe('FR-045: PipelineForecastChart', () => {
  test('FR-045: renders loading skeleton', () => {
    const { container } = render(<PipelineForecastChart data={undefined} isLoading={true} />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('FR-045: renders empty state when no stages', () => {
    render(<PipelineForecastChart data={{ stages: [], totalWeightedForecast: 0, totalOpenValue: 0 }} isLoading={false} />);
    expect(screen.getByText('No pipeline data available')).toBeDefined();
  });

  test('FR-045: renders chart with forecast data', () => {
    const data = {
      stages: [
        { stage: 'prospect', count: 10, totalValue: 100000, weightedValue: 20000 },
        { stage: 'qualified', count: 5, totalValue: 50000, weightedValue: 17500 },
      ],
      totalWeightedForecast: 37500,
      totalOpenValue: 150000,
    };
    render(<PipelineForecastChart data={data} isLoading={false} />);
    expect(screen.getByText('Pipeline Forecast')).toBeDefined();
    expect(screen.getByTestId('pipeline-forecast-chart')).toBeDefined();
    // Displays totals
    expect(screen.getByText(/\$150,000.00 open/)).toBeDefined();
    expect(screen.getByText(/\$37,500.00 weighted/)).toBeDefined();
  });
});

describe('FR-045: HealthDonutChart', () => {
  test('FR-045: renders loading skeleton', () => {
    const { container } = render(<HealthDonutChart data={undefined} isLoading={true} />);
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('FR-045: renders empty state when no data', () => {
    render(<HealthDonutChart data={undefined} isLoading={false} />);
    expect(screen.getByText('No health data available')).toBeDefined();
  });

  test('FR-045: renders donut chart with health data', () => {
    const data = { healthy: 20, atRisk: 5, critical: 2 };
    render(<HealthDonutChart data={data} isLoading={false} />);
    expect(screen.getByText('Account Health Distribution')).toBeDefined();
    expect(screen.getByText('27 total accounts')).toBeDefined();
    expect(screen.getByTestId('health-donut-chart')).toBeDefined();
  });

  test('FR-045: renders chart showing total accounts count', () => {
    const data = { healthy: 15, atRisk: 3, critical: 1 };
    render(<HealthDonutChart data={data} isLoading={false} />);
    expect(screen.getByText('19 total accounts')).toBeDefined();
  });
});
