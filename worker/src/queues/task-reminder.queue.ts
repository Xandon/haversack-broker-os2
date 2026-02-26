export const TASK_REMINDER_QUEUE_NAME = 'task-reminder';

export interface TaskReminderJobData {
  taskId: string;
  tenantId: string;
  reminderType: '24h' | '1h';
  taskTitle: string;
  assigneeId: string;
  dueDate: string;
}
