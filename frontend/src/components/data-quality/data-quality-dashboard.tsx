'use client';


import { CompositeScore } from './composite-score';
import { ScorecardMetric } from './scorecard-metric';

import type { DataQualityScorecard } from '@/hooks/use-data-quality';

interface DataQualityDashboardProps {
  scorecard: DataQualityScorecard;
  onMetricClick?: (metricKey: string) => void;
}

export function DataQualityDashboard({ scorecard, onMetricClick }: DataQualityDashboardProps) {
  return (
    <div>
      <div className="mb-6">
        <CompositeScore score={scorecard.compositeScore} calculatedAt={scorecard.calculatedAt} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {scorecard.metrics.map((metric) => (
          <ScorecardMetric key={metric.key} metric={metric} onClick={onMetricClick} />
        ))}
      </div>
    </div>
  );
}
