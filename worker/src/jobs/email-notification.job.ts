import type { EmailNotificationJobData } from '../queues/email-notification.queue';

export interface EmailSendResult {
  status: 'sent' | 'failed';
  error?: string;
}

export interface EmailTransport {
  sendMail(options: {
    to: string;
    subject: string;
    text: string;
  }): Promise<{ messageId: string }>;
}

export async function processEmailNotification(
  transport: EmailTransport,
  data: EmailNotificationJobData,
): Promise<EmailSendResult> {
  try {
    await transport.sendMail({
      to: data.recipientEmail,
      subject: data.subject,
      text: data.body,
    });

    return { status: 'sent' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { status: 'failed', error: message };
  }
}

export function buildReminderEmail(
  recipientEmail: string,
  recipientName: string,
  taskTitle: string,
  reminderType: '24h' | '1h',
  dueDate: string,
): EmailNotificationJobData {
  const reminderLabel = reminderType === '24h' ? '24 hours' : '1 hour';
  return {
    tenantId: '',
    recipientEmail,
    recipientName,
    subject: `Task Reminder: "${taskTitle}" due in ${reminderLabel}`,
    body: `Hi ${recipientName},\n\nThis is a reminder that your task "${taskTitle}" is due in ${reminderLabel}.\n\nDue date: ${dueDate}\n\n— Haversack Platform`,
  };
}
