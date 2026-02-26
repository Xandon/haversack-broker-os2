export const EMAIL_NOTIFICATION_QUEUE_NAME = 'email-notification';

export interface EmailNotificationJobData {
  tenantId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  notificationId?: string;
}
