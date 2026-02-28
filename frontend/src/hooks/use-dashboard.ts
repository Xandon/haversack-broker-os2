'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export interface RepKpiData {
  currentMonthRevenue: number;
  trailingTwelveMonthRevenue: number;
  accountsManaged: number;
  activitiesThisMonth: number;
  openOpportunities: number;
  weightedPipelineValue: number;
  commissionMtd: number;
  commissionYtd: number;
  healthDistribution: {
    healthy: number;
    atRisk: number;
    critical: number;
  };
}

export interface RepRanking {
  repId: string;
  repName: string;
  isActive: boolean;
  revenue: number;
  orderCount: number;
  activityCount: number;
  pipelineValue: number;
}

export interface TeamDashboardData {
  monthlyRevenue: { month: string; revenue: number }[];
  repRankings: RepRanking[];
  totalTeamRevenue: number;
  totalOrders: number;
}

export function useRepKpi(repId?: string) {
  return useQuery<RepKpiData>({
    queryKey: ['dashboard', 'rep', repId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (repId) params.set('repId', repId);
      const qs = params.toString();
      return apiClient.get(`/api/dashboard/rep${qs ? `?${qs}` : ''}`);
    },
  });
}

export function useTeamDashboard(dateRange?: { start: string; end: string }) {
  return useQuery<TeamDashboardData>({
    queryKey: ['dashboard', 'team', dateRange],
    queryFn: () => {
      const params = new URLSearchParams();
      if (dateRange) {
        params.set('start', dateRange.start);
        params.set('end', dateRange.end);
      }
      const qs = params.toString();
      return apiClient.get(`/api/dashboard/team${qs ? `?${qs}` : ''}`);
    },
  });
}
