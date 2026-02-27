import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface RepDashboardData {
  revenue: { currentMonth: number; trailing12Months: number };
  activities: { currentMonthCount: number };
  opportunities: { openCount: number; weightedPipelineValue: number };
  commissions: { currentMonth: number; ytd: number };
  accountHealth: { healthy: number; atRisk: number; critical: number };
  hasData: boolean;
  period: { start: string; end: string };
}

export interface TeamDashboardData {
  repRankings: Array<{
    repId: string;
    repName: string;
    isActive: boolean;
    revenue: number;
    orderCount: number;
    activityCount: number;
    pipelineValue: number;
  }>;
  totals: {
    totalRevenue: number;
    totalOrders: number;
    totalActivities: number;
    totalPipelineValue: number;
    activeRepCount: number;
  };
  hasData: boolean;
  period: { start: string; end: string };
}

export interface CriticalAccount {
  id: string;
  name: string;
  healthScore: number;
  territory: string;
}

type DashboardPeriod = 'current_month' | 'last_month' | 'current_quarter' | 'ytd' | 'trailing_12_months';

export function useRepDashboard(period: DashboardPeriod = 'current_month'): ReturnType<typeof useQuery<RepDashboardData>> {
  return useQuery<RepDashboardData>({
    queryKey: ['dashboard', 'rep', period],
    queryFn: async () => {
      const response = await apiClient<{ data: RepDashboardData }>(
        `/api/dashboards/rep?period=${period}`,
      );
      return response.data;
    },
  });
}

export function useTeamDashboard(period: DashboardPeriod = 'current_month'): ReturnType<typeof useQuery<TeamDashboardData>> {
  return useQuery<TeamDashboardData>({
    queryKey: ['dashboard', 'team', period],
    queryFn: async () => {
      const response = await apiClient<{ data: TeamDashboardData }>(
        `/api/dashboards/team?period=${period}`,
      );
      return response.data;
    },
  });
}

export function useCriticalAccounts(): ReturnType<typeof useQuery<CriticalAccount[]>> {
  return useQuery<CriticalAccount[]>({
    queryKey: ['dashboard', 'critical-accounts'],
    queryFn: async () => {
      const response = await apiClient<{ data: CriticalAccount[] }>(
        '/api/dashboards/rep/critical-accounts',
      );
      return response.data;
    },
  });
}
