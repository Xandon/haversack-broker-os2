'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface DataQualityScore {
  accountCompleteness: number;
  contactEmailValidity: number;
  productImages: number;
  duplicateAccountCount: number;
  staleAccountCount: number;
  compositeScore: number;
  calculatedAt: string;
}

export interface DataQualityScorecardResponse {
  data: DataQualityScore;
}

export type QualityDrillDownMetric =
  | 'accountCompleteness'
  | 'contactEmailValidity'
  | 'productImages'
  | 'duplicateAccounts'
  | 'staleAccounts';

export interface DrillDownItem {
  id: string;
  name: string;
  issue: string;
}

export interface DrillDownResponse {
  data: {
    metric: string;
    items: DrillDownItem[];
    total: number;
    page: number;
    limit: number;
  };
}

export function useQualityScorecard(): ReturnType<typeof useQuery<DataQualityScorecardResponse>> {
  return useQuery<DataQualityScorecardResponse>({
    queryKey: ['quality-scorecard'],
    queryFn: () => apiClient<DataQualityScorecardResponse>('/api/admin/quality/scorecard'),
  });
}

export function useQualityDrillDown(
  metric: QualityDrillDownMetric | undefined,
  page: number = 1,
  limit: number = 50,
): ReturnType<typeof useQuery<DrillDownResponse>> {
  return useQuery<DrillDownResponse>({
    queryKey: ['quality-drill-down', metric, page, limit],
    queryFn: () =>
      apiClient<DrillDownResponse>(
        `/api/admin/quality/drill-down?metric=${metric}&page=${page}&limit=${limit}`,
      ),
    enabled: !!metric,
  });
}
