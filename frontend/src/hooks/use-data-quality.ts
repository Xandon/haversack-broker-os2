'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';

export interface DataQualityMetric {
  key: string;
  label: string;
  value: number;
  total: number;
  percentage: number;
  weight: number;
}

export interface DataQualityScorecard {
  metrics: DataQualityMetric[];
  compositeScore: number;
  calculatedAt: string;
}

export function useDataQualityScorecard() {
  return useQuery<DataQualityScorecard>({
    queryKey: ['data-quality', 'scorecard'],
    queryFn: () => apiClient.get('/api/data-quality/scorecard'),
  });
}
