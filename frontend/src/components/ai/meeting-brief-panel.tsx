'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMeetingBrief } from '@/hooks/use-ai';
import type { MeetingBriefResponse } from '@/hooks/use-ai';
import { AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';

interface MeetingBriefPanelProps {
  accountId: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function BriefContent({ data }: { data: MeetingBriefResponse }): React.ReactElement {
  const { brief } = data;
  const [editedSummary, setEditedSummary] = React.useState(brief.activity_summary);
  const [editedPoints, setEditedPoints] = React.useState(brief.talking_points.join('\n'));

  return (
    <div className="space-y-4">
      {brief.key_contacts.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium">Key Contacts</h4>
          <div className="space-y-1">
            {brief.key_contacts.map((contact, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium">{contact.name}</span>
                {contact.title && (
                  <span className="text-muted-foreground"> — {contact.title}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="mb-1 text-sm font-medium">Activity Summary</h4>
        <textarea
          className="w-full rounded border p-2 text-sm"
          rows={3}
          value={editedSummary}
          onChange={(e) => setEditedSummary(e.target.value)}
          aria-label="Activity summary"
        />
      </div>

      <div>
        <h4 className="mb-1 text-sm font-medium">Order Trends</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Orders (12m):</span>{' '}
            {brief.order_trends.total_orders_12m}
          </div>
          <div>
            <span className="text-muted-foreground">Revenue (12m):</span>{' '}
            {formatCurrency(brief.order_trends.total_revenue_12m)}
          </div>
          <div>
            <span className="text-muted-foreground">Avg Order:</span>{' '}
            {formatCurrency(brief.order_trends.average_order_value)}
          </div>
          <div>
            <span className="text-muted-foreground">Trend:</span>{' '}
            <span className="capitalize">{brief.order_trends.trend.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="mb-1 text-sm font-medium">Talking Points</h4>
        <textarea
          className="w-full rounded border p-2 text-sm"
          rows={4}
          value={editedPoints}
          onChange={(e) => setEditedPoints(e.target.value)}
          aria-label="Talking points"
        />
      </div>

      {brief.health_score !== null && (
        <div className="text-sm">
          <span className="text-muted-foreground">Health Score:</span>{' '}
          <span className="font-medium">{brief.health_score}</span>
          <span className="ml-2 text-muted-foreground capitalize">
            ({brief.health_trend})
          </span>
        </div>
      )}
    </div>
  );
}

export function MeetingBriefPanel({ accountId }: MeetingBriefPanelProps): React.ReactElement {
  const meetingBrief = useMeetingBrief();

  function handleGenerate(): void {
    meetingBrief.mutate({ accountId });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Meeting Brief</CardTitle>
        <div className="flex items-center gap-2">
          {meetingBrief.data && (
            <Badge variant="secondary">
              <Sparkles className="mr-1 h-3 w-3" />
              AI-Generated
            </Badge>
          )}
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={meetingBrief.isPending}
          >
            {meetingBrief.isPending ? (
              <>
                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                Generating...
              </>
            ) : meetingBrief.data ? (
              <>
                <RefreshCw className="mr-1 h-3 w-3" />
                Regenerate
              </>
            ) : (
              <>
                <Sparkles className="mr-1 h-3 w-3" />
                Prepare Meeting Brief
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {meetingBrief.isPending && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="animate-pulse">
                <Sparkles className="mr-1 h-3 w-3" />
                AI-Generated
              </Badge>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {meetingBrief.isError && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span>AI service temporarily unavailable — please try again in a few minutes</span>
            <Button size="sm" variant="outline" onClick={handleGenerate}>
              Retry
            </Button>
          </div>
        )}

        {meetingBrief.data && !meetingBrief.isPending && (
          <BriefContent data={meetingBrief.data} />
        )}

        {!meetingBrief.data && !meetingBrief.isPending && !meetingBrief.isError && (
          <p className="text-sm text-muted-foreground">
            Click &quot;Prepare Meeting Brief&quot; to generate an AI-powered briefing for your next meeting.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
