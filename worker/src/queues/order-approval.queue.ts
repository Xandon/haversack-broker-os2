export const ORDER_APPROVAL_QUEUE_NAME = 'order-approval-notification';

export interface OrderApprovalJobData {
  tenantId: string;
  orderId: string;
  orderNumber: string;
  orderTotal: number;
  repId: string;
  repEmail: string;
  repName: string;
  managerId: string;
  managerEmail: string;
  managerName: string;
  action: 'approval_required' | 'approved' | 'rejected';
  reason?: string;
}
