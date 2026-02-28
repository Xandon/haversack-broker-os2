'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivitySummary } from '@/hooks/use-ai';
import type { ActivitySummaryResponse } from '@/hooks/use-ai';
import { AlertTriangle, BarChart3, RefreshCw, Sparkles } from 'lucide-react';

interface ActivitySummaryPanelProps {
  accountId: string;
}

function SummaryContent({ data }: { data: ActivitySummaryResponse }): React.ReactElement {
  const { summary } = data;
  const [editedNarrative, setEditedNarrative] = React.useState(summary.narrative);

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Period: {summary.period} ({summary.total_activities} activities)
      </div>

      <div>
        <h4 className="mb-2 text-sm font-medium">Activity Breakdown</h4>
        <div className="grid grid-cols-4 gap-2 text-center text-sm">
          <div className="rounded bg-muted p-2">
            <div className="font-medium">{summary.activity_breakdown.visits}</div>
            <div className="text-xs text-muted-foreground">Visits</div>
          </div>
          <div className="rounded bg-muted p-2">
            <div className="font-medium">{summary.activity_breakdown.calls}</div>
            <div className="text-xs text-muted-foreground">Calls</div>
          </div>
          <div className="rounded bg-muted p-2">
            <div className="font-medium">{summary.activity_breakdown.emails}</div>
            <div className="text-xs text-muted-foreground">Emails</div>
          </div>
          <div className="rounded bg-muted p-2">
            <div className="font-medium">{summary.activity_breakdown.demos}</div>
            <div className="text-xs text-muted-foreground">Demos</div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="mb-1 text-sm font-medium">Narrative</h4>
        <textarea
          className="w-full rounded border p-2 text-sm"
          rows={4}
          value={editedNarrative}
          onChange={(e) => setEditedNarrative(e.target.value)}
          aria-label="Activity narrative"
        />
      </div>

      {summary.key_events.length > 0 && (
        <div>
          <h4 className="mb-1 text-sm font-medium">Key Events</h4>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {summary.key_events.map((event, i) => (
              <li key={i}>{event}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h4 className="mb-1 text-sm font-medium">Engagement Assessment</h4>
        <p className="text-sm">{summary.engagement_assessment}</p>
      </div>
    </div>
  );
}

export function ActivitySummaryPanel({ accountId }: ActivitySummaryPanelProps): React.ReactElement {
  const activitySummary = useActivitySummary();

  function handleGenerate(): void {
    activitySummary.mutate({ accountId, periodMonths: 6 });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Activity Summary</CardTitle>
        <div className="flex items-center gap-2">
          {activitySummary.data && (
            <Badge variant="secondary">
              <Sparkles className="mr-1 h-3 w-3" />
              AI-Generated
            </Badge>
          )}
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={activitySummary.isPending}
          >
            {activitySummary.isPending ? (
              <>
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                Generating...
              </>
            ) : activitySummary.data ? (
              <>
                <RefreshCw className="mr-1 h-3 w-3" />
                Refresh
              </>
            ) : (
              <>
                <BarChart3 className="mr-1 h-3 w-3" />
                Generate Summary
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activitySummary.isPending && (
          <div className="space-y-3">
            <Badge variant="secondary" className="animate-pulse">
              <Sparkles className="mr-1 h-3 w-3" />
              AI-Generated
            </Badge>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {activitySummary.isError && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span>AI service temporarily unavailable — please try again in a few minutes</span>
            <Button size="sm" variant="outline" onClick={handleGenerate}>
              Retry
            </Button>
          </div>
        )}

        {activitySummary.data && !activitySummary.isPending && (
          <SummaryContent data={activitySummary.data} />
        )}

        {!activitySummary.data && !activitySummary.isPending && !activitySummary.isError && (
          <p className="text-sm text-muted-foreground">
            Click &quot;Generate Summary&quot; to create an AI-powered summary of recent activities.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
