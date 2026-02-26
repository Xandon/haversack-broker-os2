'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

import { useOrder, useApproveOrder, useRejectOrder, useConfirmOrder } from '@/hooks/use-orders';
import { ApprovalBadge } from '@/components/orders/approval-badge';

// -------------------------------------------------------------------
// Order Detail Page (T093 — FR-013, FR-014, FR-017)
// -------------------------------------------------------------------

export default function OrderDetailPage(): JSX.Element {
  const params = useParams();
  const orderId = typeof params.id === 'string' ? params.id : '';
  const { order, isLoading, isError } = useOrder(orderId);
  const { approveOrder, isLoading: approving } = useApproveOrder();
  const { rejectOrder, isLoading: rejecting } = useRejectOrder();
  const { confirmOrder, isLoading: confirming } = useConfirmOrder();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-red-800">Order Not Found</h2>
        <p className="mt-2 text-sm text-red-700">
          The requested order could not be found.
        </p>
        <Link
          href="/orders"
          className="mt-4 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  const handleApprove = (): void => {
    approveOrder(orderId);
  };

  const handleReject = (): void => {
    const reason = window.prompt('Enter rejection reason:');
    if (reason) {
      rejectOrder(orderId, reason);
    }
  };

  const handleConfirm = (): void => {
    confirmOrder(orderId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/orders"
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            &larr; Back to Orders
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {order.order_number}
          </h1>
          <div className="mt-1 flex items-center gap-3">
            <ApprovalBadge status={order.status} />
            {order.approval_required && (
              <span className="text-xs text-yellow-600 font-medium">
                Approval Required (&gt;$5,000)
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {order.status === 'pending_approval' && (
            <>
              <button
                type="button"
                onClick={handleApprove}
                disabled={approving}
                className="px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {approving ? 'Approving...' : 'Approve'}
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={rejecting}
                className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {rejecting ? 'Rejecting...' : 'Reject'}
              </button>
            </>
          )}
          {(order.status === 'approved' || order.status === 'pending') && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming}
              className="px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {confirming ? 'Confirming...' : 'Confirm Order'}
            </button>
          )}
        </div>
      </div>

      {/* Order info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Order Details</h3>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Account</dt>
              <dd className="text-sm font-medium text-gray-900">
                {order.account?.name ?? '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Rep</dt>
              <dd className="text-sm font-medium text-gray-900">
                {order.rep
                  ? `${order.rep.first_name} ${order.rep.last_name}`
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Created</dt>
              <dd className="text-sm text-gray-900">
                {new Date(order.created_at).toLocaleString()}
              </dd>
            </div>
            {order.confirmed_at && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Confirmed</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(order.confirmed_at).toLocaleString()}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Totals</h3>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Subtotal</dt>
              <dd className="text-sm font-medium text-gray-900">
                ${Number(order.subtotal).toFixed(2)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Tax</dt>
              <dd className="text-sm text-gray-900">
                ${Number(order.tax_amount).toFixed(2)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <dt className="text-sm font-semibold text-gray-900">Total</dt>
              <dd className="text-lg font-bold text-gray-900">
                ${Number(order.total).toFixed(2)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Rejection reason */}
      {order.status === 'rejected' && order.rejection_reason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-800">Rejection Reason</h3>
          <p className="mt-1 text-sm text-red-700">{order.rejection_reason}</p>
        </div>
      )}

      {/* Line items */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900">
            Line Items ({order.items?.length ?? 0})
          </h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Model
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Price
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Qty
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(order.items ?? []).map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {item.product_name ?? item.product_id}
                  </div>
                  {item.product_sku && (
                    <div className="text-xs text-gray-500">{item.product_sku}</div>
                  )}
                  {item.promo_applied && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700 mt-1">
                      Promo Applied
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      item.revenue_model === 'broker'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-purple-50 text-purple-700'
                    }`}
                  >
                    {item.revenue_model === 'broker' ? 'Broker' : 'Wholesale'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">
                  ${Number(item.unit_price).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 text-center">
                  {item.quantity}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                  ${Number(item.line_total).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vendor sub-orders (FR-014) */}
      {order.vendor_sub_orders && order.vendor_sub_orders.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-900">
              Vendor Sub-Orders ({order.vendor_sub_orders.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {order.vendor_sub_orders.map((subOrder) => (
              <div key={subOrder.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {subOrder.order_number}
                  </div>
                  <div className="text-xs text-gray-500">
                    {subOrder.vendor_brand?.name ?? 'Unknown Vendor'} · {subOrder.item_count} items
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  ${Number(subOrder.subtotal).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}
    </div>
  );
}
