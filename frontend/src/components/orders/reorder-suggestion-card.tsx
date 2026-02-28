'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useReorderSuggestion } from '@/hooks/use-reorder-suggestion';
import { formatCurrency } from '@/lib/utils';
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

interface ReorderSuggestionCardProps {
  accountId: string;
  accountName: string;
}

export function ReorderSuggestionCard({
  accountId,
  accountName,
}: ReorderSuggestionCardProps): React.ReactElement {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useReorderSuggestion(accountId);

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (isError) {
    const isInsufficientHistory = (error as Error)?.message?.includes('INSUFFICIENT_HISTORY')
      || (error as Error)?.message?.includes('insufficient');

    if (isInsufficientHistory) {
      return (
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <p className="text-sm">
              Not enough order history for suggestions — reorder suggestions appear after 6 orders.
            </p>
          </div>
        </Card>
      );
    }

    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">Unable to generate suggestions at this time</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-[44px]"
            onClick={() => void refetch()}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  const suggestion = data?.data;
  if (!suggestion || suggestion.suggestions.length === 0) return <></>;

  function handleCreateOrder(): void {
    router.push(`/orders/new?accountId=${accountId}&accountName=${encodeURIComponent(accountName)}`);
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Suggested Reorder</h3>
          <Badge variant="outline" className="text-xs">AI-Generated</Badge>
        </div>
        <Button
          size="sm"
          className="min-h-[44px]"
          onClick={handleCreateOrder}
        >
          Create Order
        </Button>
      </div>

      <div className="space-y-2">
        {suggestion.suggestions.map((item) => (
          <div
            key={item.productId}
            className="flex items-center justify-between text-sm"
          >
            <div className="min-w-0 flex-1">
              <span className="font-medium">{item.productName}</span>
              <span className="ml-2 text-muted-foreground">{item.sku}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">x{item.suggestedQuantity}</span>
              <span className="font-medium">{formatCurrency(item.lineTotal)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <span className="text-sm font-medium">Estimated Total</span>
        <span className="text-lg font-semibold">{formatCurrency(suggestion.estimatedTotal)}</span>
      </div>

      {suggestion.discontinuedCount > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {suggestion.discontinuedCount} previously ordered product{suggestion.discontinuedCount > 1 ? 's are' : ' is'} no longer available.
        </p>
      )}
    </Card>
  );
}
