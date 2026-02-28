'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/patterns/page-header';
import { ErrorState } from '@/components/patterns/error-state';
import { StatusBadge } from '@/components/patterns/status-badge';
import { ConfirmationDialog } from '@/components/patterns/confirmation-dialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useOrder, useSubmitOrder, useCancelOrder, useApproveOrder, useRejectOrder } from '@/hooks/use-orders';
import { useAuth } from '@/providers/auth-provider';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { OrderLineItemResponse, VendorSubOrderResponse, OrderApprovalResponse } from '@haversack/shared';

const ORDER_STATUS_VARIANT_MAP = {
  draft: 'secondary',
  pending_approval: 'warning',
  confirmed: 'success',
  rejected: 'destructive',
  cancelled: 'destructive',
} as const;

function OrderDetailSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <Card className="p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-64" />
        ))}
      </Card>
      <Card className="p-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </Card>
    </div>
  );
}

function LineItemsTable({ lineItems }: { lineItems: OrderLineItemResponse[] }): React.ReactElement {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-4">Product</th>
            <th className="py-2 pr-4">SKU</th>
            <th className="py-2 pr-4">Brand</th>
            <th className="py-2 pr-4 text-right">Qty</th>
            <th className="py-2 pr-4 text-right">Unit Price</th>
            <th className="py-2 pr-4">Model</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item) => (
            <tr key={item.id} className="border-b last:border-0">
              <td className="py-2 pr-4 font-medium">
                {item.productName}
                {item.promotionalPriceApplied && (
                  <Badge variant="success" className="ml-2 text-xs">Promo</Badge>
                )}
              </td>
              <td className="py-2 pr-4 text-muted-foreground">{item.productSku}</td>
              <td className="py-2 pr-4">{item.brandName}</td>
              <td className="py-2 pr-4 text-right">{item.quantity}</td>
              <td className="py-2 pr-4 text-right">{formatCurrency(item.unitPrice)}</td>
              <td className="py-2 pr-4">
                <Badge variant={item.revenueModel === 'broker' ? 'outline' : 'secondary'}>
                  {item.revenueModel}
                </Badge>
              </td>
              <td className="py-2 text-right font-medium">{formatCurrency(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VendorSubOrders({ subOrders }: { subOrders: VendorSubOrderResponse[] }): React.ReactElement {
  if (subOrders.length === 0) return <></>;
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-medium">
        Vendor Sub-Orders ({subOrders.length})
      </h3>
      <div className="space-y-2">
        {subOrders.map((sub) => (
          <div key={sub.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
            <div>
              <span className="font-medium">{sub.brandName}</span>
              <span className="ml-2 text-muted-foreground">{sub.lineItemCount} items</span>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={sub.fulfillmentStatus} />
              <span className="font-medium">{formatCurrency(sub.subtotal)}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ApprovalHistory({ approvals }: { approvals: OrderApprovalResponse[] }): React.ReactElement {
  if (approvals.length === 0) return <></>;
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-medium">Approval History</h3>
      <div className="space-y-2">
        {approvals.map((approval) => (
          <div key={approval.id} className="rounded border px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{approval.approverName}</span>
              <StatusBadge
                status={approval.decision}
                variantMap={{ approved: 'success', rejected: 'destructive' }}
              />
            </div>
            {approval.reason && (
              <p className="mt-1 text-muted-foreground">{approval.reason}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">{formatDate(approval.decidedAt)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function OrderDetailPage(): React.ReactElement {
  const params = useParams();
  const { user } = useAuth();
  const orderId = params['id'] as string;

  const { data, isLoading, isError, refetch } = useOrder(orderId);
  const submitOrder = useSubmitOrder();
  const cancelOrder = useCancelOrder();
  const approveOrder = useApproveOrder();
  const rejectOrder = useRejectOrder();

  const [showCancelDialog, setShowCancelDialog] = React.useState(false);
  const [showRejectDialog, setShowRejectDialog] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState('');

  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const order = data?.data;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <OrderDetailSkeleton />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <PageHeader title="Order" />
        <ErrorState
          title="Failed to load order"
          message="The order could not be found or loaded."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  function handleSubmit(): void {
    submitOrder.mutate(orderId);
  }

  function handleCancel(): void {
    cancelOrder.mutate(orderId, {
      onSuccess: () => setShowCancelDialog(false),
    });
  }

  function handleApprove(): void {
    approveOrder.mutate(orderId);
  }

  function handleReject(): void {
    if (!rejectionReason.trim()) return;
    rejectOrder.mutate(
      { orderId, reason: rejectionReason.trim() },
      {
        onSuccess: () => {
          setShowRejectDialog(false);
          setRejectionReason('');
        },
      },
    );
  }

  const canSubmit = order.status === 'draft' && order.lineItems.length > 0;
  const canCancel = order.status === 'draft' || order.status === 'pending_approval';
  const canApprove = isManager && order.status === 'pending_approval';

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <PageHeader
        title={order.orderNumber}
        breadcrumbs={[
          { label: 'Orders', href: '/orders' },
          { label: order.orderNumber },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {canSubmit && (
              <Button
                className="min-h-[44px]"
                onClick={handleSubmit}
                disabled={submitOrder.isPending}
              >
                {submitOrder.isPending ? 'Submitting...' : 'Submit Order'}
              </Button>
            )}
            {canApprove && (
              <>
                <Button
                  className="min-h-[44px]"
                  onClick={handleApprove}
                  disabled={approveOrder.isPending}
                >
                  {approveOrder.isPending ? 'Approving...' : 'Approve'}
                </Button>
                <Button
                  variant="destructive"
                  className="min-h-[44px]"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={rejectOrder.isPending}
                >
                  Reject
                </Button>
              </>
            )}
            {canCancel && (
              <Button
                variant="outline"
                className="min-h-[44px]"
                onClick={() => setShowCancelDialog(true)}
              >
                Cancel Order
              </Button>
            )}
          </div>
        }
      />

      {/* Order Summary */}
      <Card className="p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <div className="mt-1">
              <StatusBadge status={order.status} variantMap={ORDER_STATUS_VARIANT_MAP} />
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Account</p>
            <p className="mt-1 font-medium">{order.accountName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Rep</p>
            <p className="mt-1 font-medium">{order.repName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="mt-1 text-lg font-semibold">{formatCurrency(order.total)}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="text-muted-foreground">Created: </span>
            {formatDate(order.createdAt)}
          </div>
          {order.submittedAt && (
            <div>
              <span className="text-muted-foreground">Submitted: </span>
              {formatDate(order.submittedAt)}
            </div>
          )}
          {order.confirmedAt && (
            <div>
              <span className="text-muted-foreground">Confirmed: </span>
              {formatDate(order.confirmedAt)}
            </div>
          )}
          {order.cancelledAt && (
            <div>
              <span className="text-muted-foreground">Cancelled: </span>
              {formatDate(order.cancelledAt)}
            </div>
          )}
        </div>

        {order.notes && (
          <div className="mt-4 border-t pt-4">
            <p className="text-sm text-muted-foreground">Notes</p>
            <p className="mt-1 text-sm">{order.notes}</p>
          </div>
        )}

        {order.exportStatus && (
          <div className="mt-4 border-t pt-4">
            <p className="text-sm text-muted-foreground">Export Status</p>
            <div className="mt-1">
              <StatusBadge
                status={order.exportStatus}
                variantMap={{ queued: 'warning', exported: 'success', failed: 'destructive' }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Line Items */}
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-medium">
          Line Items ({order.lineItems.length})
        </h3>
        <LineItemsTable lineItems={order.lineItems} />

        <div className="mt-4 border-t pt-4">
          <div className="flex justify-end space-y-1 text-sm">
            <div className="w-48 space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Vendor Sub-Orders */}
      <VendorSubOrders subOrders={order.vendorSubOrders} />

      {/* Approval History */}
      <ApprovalHistory approvals={order.approvals} />

      {/* Cancel Dialog */}
      <ConfirmationDialog
        isOpen={showCancelDialog}
        onCancel={() => setShowCancelDialog(false)}
        title="Cancel Order"
        description={`Are you sure you want to cancel order ${order.orderNumber}? This action cannot be undone.`}
        onConfirm={handleCancel}
        confirmLabel={cancelOrder.isPending ? 'Cancelling...' : 'Cancel Order'}
        variant="destructive"
      />

      {/* Reject Dialog — using Dialog directly for custom content */}
      {showRejectDialog && (
        <ConfirmationDialog
          isOpen={showRejectDialog}
          onCancel={() => {
            setShowRejectDialog(false);
            setRejectionReason('');
          }}
          title="Reject Order"
          description={`Reject order ${order.orderNumber}? Please provide a reason.`}
          onConfirm={handleReject}
          confirmLabel={rejectOrder.isPending ? 'Rejecting...' : 'Reject Order'}
          variant="destructive"
        />
      )}

      {/* Rejection reason input — shown when reject dialog is open */}
      {showRejectDialog && (
        <Card className="border-destructive p-4">
          <Label htmlFor="rejection-reason" className="text-sm font-medium">
            Rejection Reason (required)
          </Label>
          <Textarea
            id="rejection-reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter rejection reason..."
            className="mt-2"
            rows={3}
            maxLength={2000}
          />
        </Card>
      )}
    </div>
  );
}
