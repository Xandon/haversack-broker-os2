import { describe, test, expect } from 'vitest';
import { notificationTypeSchema, notificationResponseSchema } from './notification.schema';

describe('FR-009: Notification Zod schemas', () => {
  describe('notificationTypeSchema', () => {
    test('FR-009: accepts all valid notification types', () => {
      expect(notificationTypeSchema.parse('task_reminder')).toBe('task_reminder');
      expect(notificationTypeSchema.parse('task_assigned')).toBe('task_assigned');
      expect(notificationTypeSchema.parse('task_overdue')).toBe('task_overdue');
      expect(notificationTypeSchema.parse('order_approval_required')).toBe('order_approval_required');
      expect(notificationTypeSchema.parse('order_approved')).toBe('order_approved');
      expect(notificationTypeSchema.parse('order_rejected')).toBe('order_rejected');
      expect(notificationTypeSchema.parse('order_export_failed')).toBe('order_export_failed');
    });

    test('FR-009: rejects invalid notification type', () => {
      expect(() => notificationTypeSchema.parse('email_received')).toThrow();
    });
  });

  describe('notificationResponseSchema', () => {
    test('FR-009: validates complete notification response', () => {
      const response = {
        id: '00000000-0000-4000-a000-000000000001',
        tenantId: '00000000-0000-4000-a000-000000000002',
        userId: '00000000-0000-4000-a000-000000000003',
        type: 'task_reminder',
        title: 'Task due in 1 hour',
        body: 'Follow up with buyer at Pacific Bistro',
        referenceId: '00000000-0000-4000-a000-000000000004',
        referenceType: 'task',
        isRead: false,
        readAt: null,
        createdAt: '2026-02-26T10:00:00.000Z',
      };
      const result = notificationResponseSchema.parse(response);
      expect(result.isRead).toBe(false);
    });

    test('FR-009: validates read notification', () => {
      const response = {
        id: '00000000-0000-4000-a000-000000000001',
        tenantId: '00000000-0000-4000-a000-000000000002',
        userId: '00000000-0000-4000-a000-000000000003',
        type: 'task_assigned',
        title: 'New task assigned',
        body: null,
        referenceId: null,
        referenceType: null,
        isRead: true,
        readAt: '2026-02-26T11:00:00.000Z',
        createdAt: '2026-02-26T10:00:00.000Z',
      };
      const result = notificationResponseSchema.parse(response);
      expect(result.isRead).toBe(true);
    });
  });
});
