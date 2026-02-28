'use client';

import type { Commission } from '@/hooks/use-commissions';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  exported: 'bg-blue-100 text-blue-700',
  disputed: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  exported: 'Exported',
  disputed: 'Disputed',
};

interface CommissionLineItemTableProps {
  lineItems: Commission[];
  onApprove?: (id: string) => void;
  onDispute?: (id: string) => void;
  showActions?: boolean;
}

export function CommissionLineItemTable({
  lineItems,
  onApprove,
  onDispute,
  showActions = false,
}: CommissionLineItemTableProps) {
  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" role="table">
        <thead>
          <tr className="border-b border-gray-200 text-xs text-gray-500">
            <th className="px-3 py-2">Order</th>
            <th className="px-3 py-2">Brand</th>
            <th className="px-3 py-2 text-right">Line Total</th>
            <th className="px-3 py-2 text-right">Rate</th>
            <th className="px-3 py-2 text-right">Amount</th>
            <th className="px-3 py-2">Status</th>
            {showActions && <th className="px-3 py-2">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item) => (
            <tr
              key={item.id}
              className={`border-b border-gray-100 ${item.status === 'disputed' ? 'bg-red-50' : ''}`}
            >
              <td className="px-3 py-2 text-indigo-600">
                {item.order?.orderNumber ?? item.orderId.slice(0, 8)}
              </td>
              <td className="px-3 py-2">{item.brand?.name ?? '—'}</td>
              <td className="px-3 py-2 text-right">{formatCurrency(item.lineTotal)}</td>
              <td className="px-3 py-2 text-right">{item.effectiveRate}%</td>
              <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.amount)}</td>
              <td className="px-3 py-2">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[item.status] ?? STATUS_STYLES.pending}`}
                >
                  {STATUS_LABELS[item.status] ?? item.status}
                </span>
              </td>
              {showActions && (
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    {item.status !== 'approved' && item.status !== 'disputed' && onApprove && (
                      <button
                        className="rounded px-2 py-1 text-xs text-green-600 hover:bg-green-50"
                        onClick={() => onApprove(item.id)}
                      >
                        Approve
                      </button>
                    )}
                    {item.status !== 'disputed' && item.status !== 'approved' && onDispute && (
                      <button
                        className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        onClick={() => onDispute(item.id)}
                      >
                        Dispute
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {lineItems.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-400">
          No commissions calculated for this period
        </p>
      )}
    </div>
  );
}
