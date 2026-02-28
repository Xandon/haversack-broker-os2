'use client';

import { useState } from 'react';

import { CommissionLineItemTable } from '@/components/commissions/commission-line-item-table';
import { CommissionSummaryCard } from '@/components/commissions/commission-summary-card';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { SkeletonCard, SkeletonTable } from '@/components/shared/skeleton';
import { useCommissions, useCommissionSummary } from '@/hooks/use-commissions';

export default function CommissionDashboardPage() {
  const [period, setPeriod] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useCommissionSummary();
  const {
    data: commissions,
    isLoading: listLoading,
    error: listError,
    refetch: refetchList,
  } = useCommissions({
    page,
    limit: 20,
    period: period || undefined,
    status: status || undefined,
  });

  if (summaryError || listError) {
    return (
      <ErrorBanner
        message="Unable to load commissions"
        onRetry={() => {
          refetchSummary();
          refetchList();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Commissions</h1>

      {summaryLoading ? (
        <SkeletonCard />
      ) : summary ? (
        <CommissionSummaryCard summary={summary} />
      ) : null}

      <div className="flex flex-wrap gap-3">
        <input
          type="month"
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="Filter by period"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="disputed">Disputed</option>
          <option value="exported">Exported</option>
        </select>
      </div>

      {listLoading ? (
        <SkeletonTable rows={8} />
      ) : !commissions || commissions.data.length === 0 ? (
        <EmptyState
          title="No commissions for this period"
          description="Commissions will appear here when orders are processed"
        />
      ) : (
        <CommissionLineItemTable
          lineItems={commissions.data}
          onApprove={() => {}}
          onDispute={() => {}}
          showActions
        />
      )}
    </div>
  );
}
