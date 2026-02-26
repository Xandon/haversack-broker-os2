import type { PrismaClient } from '@prisma/client';
import type { TaskReminderJobData } from '../queues/task-reminder.queue';

export interface TaskReminderResult {
  status: 'sent' | 'skipped';
  reason?: string;
  notificationId?: string;
}

export async function processTaskReminder(
  prisma: PrismaClient,
  data: TaskReminderJobData,
): Promise<TaskReminderResult> {
  // Check if task still exists and is not completed/cancelled/deleted
  const task = await prisma.task.findFirst({
    where: {
      id: data.taskId,
      tenantId: data.tenantId,
      deletedAt: null,
    },
  });

  if (!task) {
    return { status: 'skipped', reason: 'Task not found or deleted' };
  }

  if (task.status === 'completed' || task.status === 'cancelled') {
    return { status: 'skipped', reason: `Task already ${task.status}` };
  }

  // Get assignee info for notification
  const assignee = await prisma.user.findFirst({
    where: { id: data.assigneeId, tenantId: data.tenantId },
  });

  if (!assignee || !assignee.isActive) {
    return { status: 'skipped', reason: 'Assignee not found or inactive' };
  }

  // Create in-app notification
  const reminderLabel = data.reminderType === '24h' ? '24 hours' : '1 hour';
  const notification = await prisma.notification.create({
    data: {
      tenantId: data.tenantId,
      userId: data.assigneeId,
      type: 'task_reminder',
      title: `Task due in ${reminderLabel}`,
      message: `"${data.taskTitle}" is due ${reminderLabel} from now.`,
      data: JSON.stringify({
        taskId: data.taskId,
        reminderType: data.reminderType,
        dueDate: data.dueDate,
      }),
    },
  });

  // Mark reminder as sent
  const reminders = await prisma.taskReminder.findMany({
    where: {
      taskId: data.taskId,
      type: data.reminderType,
      sentAt: null,
    },
  });

  for (const reminder of reminders) {
    await prisma.taskReminder.update({
      where: { id: reminder.id },
      data: { sentAt: new Date() },
    });
  }

  return {
    status: 'sent',
    notificationId: notification.id,
  };
}

export function buildEmailPayload(
  data: TaskReminderJobData,
  recipientEmail: string,
  recipientName: string,
): {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
} {
  const reminderLabel = data.reminderType === '24h' ? '24 hours' : '1 hour';
  return {
    recipientEmail,
    recipientName,
    subject: `Task Reminder: "${data.taskTitle}" due in ${reminderLabel}`,
    body: `Hi ${recipientName},\n\nThis is a reminder that your task "${data.taskTitle}" is due in ${reminderLabel}.\n\nDue date: ${data.dueDate}\n\n— Haversack Platform`,
  };
}
