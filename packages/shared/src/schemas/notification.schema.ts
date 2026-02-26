import { z } from 'zod';

export const notificationTypeSchema = z.enum([
  'task_reminder',
  'task_assigned',
  'task_overdue',
  'order_approval_required',
  'order_approved',
  'order_rejected',
  'order_export_failed',
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const notificationResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  type: notificationTypeSchema,
  title: z.string(),
  body: z.string().nullable(),
  referenceId: z.string().uuid().nullable(),
  referenceType: z.string().nullable(),
  isRead: z.boolean(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});

export type NotificationResponse = z.infer<typeof notificationResponseSchema>;
