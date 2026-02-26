import type { PrismaClient } from '@prisma/client';
import type { OrderApprovalJobData } from '../queues/order-approval.queue';

export interface ApprovalNotificationResult {
  notificationCreated: boolean;
  emailQueued: boolean;
  recipientId: string;
  notificationType: string;
}

export async function processOrderApprovalNotification(
  prisma: PrismaClient,
  data: OrderApprovalJobData,
): Promise<ApprovalNotificationResult> {
  const { tenantId, orderId, orderNumber, action } = data;

  let recipientId: string;
  let title: string;
  let body: string;
  let notificationType: string;

  if (action === 'approval_required') {
    recipientId = data.managerId;
    title = `Order ${orderNumber} requires approval`;
    body = `${data.repName} submitted order ${orderNumber} for $${data.orderTotal.toFixed(2)}. This order requires manager approval.`;
    notificationType = 'order_approval_required';
  } else if (action === 'approved') {
    recipientId = data.repId;
    title = `Order ${orderNumber} approved`;
    body = `${data.managerName} approved your order ${orderNumber} for $${data.orderTotal.toFixed(2)}.`;
    notificationType = 'order_approved';
  } else {
    recipientId = data.repId;
    title = `Order ${orderNumber} rejected`;
    body = `${data.managerName} rejected your order ${orderNumber}. Reason: ${data.reason ?? 'No reason provided'}`;
    notificationType = 'order_rejected';
  }

  await prisma.notification.create({
    data: {
      tenantId,
      userId: recipientId,
      type: notificationType as 'order_approval_required' | 'order_approved' | 'order_rejected',
      title,
      body,
      referenceId: orderId,
      referenceType: 'order',
    },
  });

  return {
    notificationCreated: true,
    emailQueued: true,
    recipientId,
    notificationType,
  };
}

export function buildApprovalRequiredNotification(
  repName: string,
  orderNumber: string,
  orderTotal: number,
  managerEmail: string,
  _managerName: string,
): { subject: string; body: string; to: string } {
  return {
    to: managerEmail,
    subject: `Order ${orderNumber} requires your approval`,
    body: `${repName} submitted order ${orderNumber} for $${orderTotal.toFixed(2)}.\n\nThis order exceeds the $5,000 approval threshold and requires your review.\n\nPlease log in to approve or reject this order.`,
  };
}

export function buildApprovalDecisionNotification(
  decision: 'approved' | 'rejected',
  managerName: string,
  orderNumber: string,
  orderTotal: number,
  repEmail: string,
  reason?: string,
): { subject: string; body: string; to: string } {
  const decisionText = decision === 'approved' ? 'approved' : 'rejected';
  const reasonText = reason ? `\n\nReason: ${reason}` : '';

  return {
    to: repEmail,
    subject: `Order ${orderNumber} ${decisionText}`,
    body: `${managerName} has ${decisionText} your order ${orderNumber} for $${orderTotal.toFixed(2)}.${reasonText}`,
  };
}
