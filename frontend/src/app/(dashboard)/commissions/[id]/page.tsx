'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';

import { CommissionLineItemTable } from '@/components/commissions/commission-line-item-table';
import { ErrorBanner } from '@/components/shared/error-banner';
import { Skeleton, SkeletonTable } from '@/components/shared/skeleton';
import {
  useCommissionStatement,
  useApproveCommission,
  useDisputeCommission,
  useApproveStatement,
} from '@/hooks/use-commissions';

export default function CommissionStatementDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const repId = params['id'] as string;
  const period = searchParams.get('period') ?? '';

  const { data: statement, isLoading, error } = useCommissionStatement(repId, period);
  const approveCommission = useApproveCommission();
  const disputeCommission = useDisputeCommission();
  const approveStatement = useApproveStatement();

  if (!period) {
    return (
      <div className="space-y-4">
        <ErrorBanner message="No period specified" />
        <Link href="/commissions" className="text-sm text-blue-600 hover:underline">
          Back to commissions
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorBanner message="Unable to load commission statement" />
        <Link href="/commissions" className="text-sm text-blue-600 hover:underline">
          Back to commissions
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
        <SkeletonTable rows={5} />
      </div>
    );
  }

  if (!statement) return null;

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/commissions" className="text-sm text-blue-600 hover:underline">
          &larr; Back to commissions
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Commission Statement — {statement.period}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {statement.repName} &middot;{' '}
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                statement.status === 'approved'
                  ? 'bg-green-100 text-green-800'
                  : statement.status === 'exported'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
              }`}
            >
              {statement.status}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-gray-900">
            Total: {formatCurrency(statement.totalAmount)}
          </span>
          {statement.status !== 'approved' && statement.status !== 'exported' && (
            <button
              type="button"
              onClick={() => approveStatement.mutate({ repId, period })}
              disabled={approveStatement.isPending}
              className="rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {approveStatement.isPending ? 'Approving...' : 'Approve Statement'}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <CommissionLineItemTable
          lineItems={statement.lineItems}
          showActions
          onApprove={(id) => approveCommission.mutate(id)}
          onDispute={(id) => disputeCommission.mutate(id)}
        />
      </div>
    </div>
  );
}
