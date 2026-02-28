import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import DashboardPage from './page';

import type { RepKpiData, TeamDashboardData } from '@/hooks/use-dashboard';


vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockUseRepKpi = vi.fn();
const mockUseTeamDashboard = vi.fn();

vi.mock('@/hooks/use-dashboard', () => ({
  useRepKpi: (...args: unknown[]) => mockUseRepKpi(...args),
  useTeamDashboard: (...args: unknown[]) => mockUseTeamDashboard(...args),
}));

const mockKpiData: RepKpiData = {
  currentMonthRevenue: 100000,
  trailingTwelveMonthRevenue: 1000000,
  accountsManaged: 30,
  activitiesThisMonth: 20,
  openOpportunities: 10,
  weightedPipelineValue: 300000,
  commissionMtd: 5000,
  commissionYtd: 50000,
  healthDistribution: { healthy: 20, atRisk: 5, critical: 3 },
};

const mockTeamData: TeamDashboardData = {
  monthlyRevenue: [],
  repRankings: [
    {
      repId: '1',
      repName: 'Test Rep',
      isActive: true,
      revenue: 50000,
      orderCount: 12,
      activityCount: 10,
      pipelineValue: 150000,
    },
  ],
  totalTeamRevenue: 50000,
  totalOrders: 12,
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FR-P003: renders "Dashboard" heading with KPI data on success', () => {
    mockUseRepKpi.mockReturnValue({
      data: mockKpiData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseTeamDashboard.mockReturnValue({
      data: mockTeamData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DashboardPage />);

    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText('$100,000')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('$5,000')).toBeInTheDocument();
  });

  it('FR-P003: renders team performance section with rep rankings', () => {
    mockUseRepKpi.mockReturnValue({
      data: mockKpiData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseTeamDashboard.mockReturnValue({
      data: mockTeamData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DashboardPage />);

    expect(screen.getByText('Team Performance')).toBeInTheDocument();
    expect(screen.getByText('Test Rep')).toBeInTheDocument();
  });

  it('FR-P003: shows skeleton cards when KPI data is loading', () => {
    mockUseRepKpi.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });
    mockUseTeamDashboard.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<DashboardPage />);

    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    const skeletons = screen.getAllByRole('status');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('FR-P003: shows error banner when KPI request fails', () => {
    mockUseRepKpi.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Server error'),
      refetch: vi.fn(),
    });
    mockUseTeamDashboard.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DashboardPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Unable to load dashboard')).toBeInTheDocument();
  });

  it('FR-P003: error banner has retry button that calls refetch', () => {
    const mockRefetch = vi.fn();
    mockUseRepKpi.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('fail'),
      refetch: mockRefetch,
    });
    mockUseTeamDashboard.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DashboardPage />);

    screen.getByText('Retry').click();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('FR-P003: shows empty state when KPI data is null', () => {
    mockUseRepKpi.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseTeamDashboard.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DashboardPage />);

    expect(screen.getByText('No activity yet')).toBeInTheDocument();
    expect(screen.getByText('Start by visiting your accounts')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view accounts/i })).toHaveAttribute(
      'href',
      '/accounts',
    );
  });

  it('FR-P003: shows team error banner when team data fails but KPI succeeds', () => {
    mockUseRepKpi.mockReturnValue({
      data: mockKpiData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseTeamDashboard.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('team fail'),
      refetch: vi.fn(),
    });

    render(<DashboardPage />);

    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText('Unable to load team data')).toBeInTheDocument();
  });

  it('FR-P003: shows team skeleton card when team data is loading', () => {
    mockUseRepKpi.mockReturnValue({
      data: mockKpiData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseTeamDashboard.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<DashboardPage />);

    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText('Team Performance')).toBeInTheDocument();
    // At least one skeleton status from the team section
    const skeletons = screen.getAllByRole('status');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
