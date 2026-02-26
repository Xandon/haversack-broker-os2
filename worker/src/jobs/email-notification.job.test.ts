import { describe, it, expect, vi } from 'vitest';
import { processEmailNotification, buildReminderEmail } from './email-notification.job';
import type { EmailTransport } from './email-notification.job';

describe('FR-009: Email Notification Job', () => {
  describe('processEmailNotification', () => {
    it('sends email successfully via transport', async () => {
      const mockTransport: EmailTransport = {
        sendMail: vi.fn().mockResolvedValue({ messageId: 'msg-123' }),
      };

      const result = await processEmailNotification(mockTransport, {
        tenantId: 'tenant-1',
        recipientEmail: 'rep@haversack.test',
        recipientName: 'Test Rep',
        subject: 'Task Reminder',
        body: 'Your task is due soon.',
      });

      expect(result.status).toBe('sent');
      expect(mockTransport.sendMail).toHaveBeenCalledWith({
        to: 'rep@haversack.test',
        subject: 'Task Reminder',
        text: 'Your task is due soon.',
      });
    });

    it('returns failed status on transport error', async () => {
      const mockTransport: EmailTransport = {
        sendMail: vi.fn().mockRejectedValue(new Error('SMTP connection refused')),
      };

      const result = await processEmailNotification(mockTransport, {
        tenantId: 'tenant-1',
        recipientEmail: 'rep@haversack.test',
        recipientName: 'Test Rep',
        subject: 'Task Reminder',
        body: 'Your task is due soon.',
      });

      expect(result.status).toBe('failed');
      expect(result.error).toBe('SMTP connection refused');
    });

    it('handles non-Error throws gracefully', async () => {
      const mockTransport: EmailTransport = {
        sendMail: vi.fn().mockRejectedValue('string error'),
      };

      const result = await processEmailNotification(mockTransport, {
        tenantId: 'tenant-1',
        recipientEmail: 'rep@haversack.test',
        recipientName: 'Test Rep',
        subject: 'Task Reminder',
        body: 'Your task is due soon.',
      });

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Unknown error');
    });
  });

  describe('buildReminderEmail', () => {
    it('builds 24h reminder email', () => {
      const email = buildReminderEmail(
        'rep@haversack.test',
        'Test Rep',
        'Follow up with buyer',
        '24h',
        '2026-03-01T10:00:00.000Z',
      );

      expect(email.recipientEmail).toBe('rep@haversack.test');
      expect(email.subject).toContain('24 hours');
      expect(email.subject).toContain('Follow up with buyer');
      expect(email.body).toContain('Test Rep');
    });

    it('builds 1h reminder email', () => {
      const email = buildReminderEmail(
        'rep@haversack.test',
        'Test Rep',
        'Call buyer',
        '1h',
        '2026-03-01T10:00:00.000Z',
      );

      expect(email.subject).toContain('1 hour');
      expect(email.body).toContain('1 hour');
    });
  });
});
