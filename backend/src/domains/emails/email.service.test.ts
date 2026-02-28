import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createEmailService } from './email.service';

function makePrisma() {
  return {
    emailRecord: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    emailTemplate: {
      findMany: vi.fn(),
    },
  } as unknown as Parameters<typeof createEmailService>[0];
}

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000001';
const USER = 'bbbbbbbb-0000-0000-0000-000000000001';
const ACCOUNT = 'cccccccc-0000-0000-0000-000000000001';

describe('EmailService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: ReturnType<typeof createEmailService>;

  beforeEach(() => {
    prisma = makePrisma();
    service = createEmailService(prisma);
  });

  describe('list', () => {
    it('FR-010: returns paginated email records', async () => {
      const mockEmails = [
        {
          id: '1',
          direction: 'outbound',
          subject: 'Follow up',
          bodyPreview: 'Thanks for meeting',
          fromAddress: 'rep@haversack.com',
          toAddresses: ['buyer@example.com'],
          ccAddresses: [],
          engagementStatus: 'sent',
          openedAt: null,
          clickedAt: null,
          bouncedAt: null,
          isMatched: true,
          createdAt: new Date(),
          account: { id: ACCOUNT, name: 'Acme' },
          contact: null,
        },
      ];
      (prisma.emailRecord.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockEmails);
      (prisma.emailRecord.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);

      const result = await service.list(TENANT, 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.emailRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('FR-010: filters by accountId', async () => {
      (prisma.emailRecord.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.emailRecord.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      await service.list(TENANT, 1, 20, { accountId: ACCOUNT });

      expect(prisma.emailRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT, accountId: ACCOUNT },
        }),
      );
    });

    it('FR-010: filters by direction', async () => {
      (prisma.emailRecord.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.emailRecord.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      await service.list(TENANT, 1, 20, { direction: 'inbound' });

      expect(prisma.emailRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT, direction: 'inbound' },
        }),
      );
    });
  });

  describe('sendEmail', () => {
    it('FR-010: creates outbound email record', async () => {
      const created = {
        id: 'new-id',
        direction: 'outbound',
        subject: 'Hello',
        fromAddress: `user-${USER}@app.haversack.com`,
        toAddresses: ['buyer@example.com'],
        engagementStatus: 'sent',
        createdAt: new Date(),
      };
      (prisma.emailRecord.create as ReturnType<typeof vi.fn>).mockResolvedValue(created);

      const result = await service.sendEmail({
        tenantId: TENANT,
        userId: USER,
        accountId: ACCOUNT,
        toAddresses: ['buyer@example.com'],
        subject: 'Hello',
        bodyPreview: 'Body text',
      });

      expect(result.direction).toBe('outbound');
      expect(result.engagementStatus).toBe('sent');
      expect(prisma.emailRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            direction: 'outbound',
            isMatched: true,
            canSpamCompliant: true,
          }),
        }),
      );
    });

    it('FR-010: sets isMatched false when no account or contact', async () => {
      (prisma.emailRecord.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'new-id',
        direction: 'outbound',
        subject: 'Test',
        fromAddress: `user-${USER}@app.haversack.com`,
        toAddresses: ['unknown@example.com'],
        engagementStatus: 'sent',
        createdAt: new Date(),
      });

      await service.sendEmail({
        tenantId: TENANT,
        userId: USER,
        toAddresses: ['unknown@example.com'],
        subject: 'Test',
        bodyPreview: 'Body',
      });

      expect(prisma.emailRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isMatched: false }),
        }),
      );
    });
  });

  describe('updateEngagement', () => {
    it('AC-010a: updates engagement status to opened with timestamp', async () => {
      (prisma.emailRecord.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'email-1',
        engagementStatus: 'opened',
        openedAt: new Date(),
        clickedAt: null,
        bouncedAt: null,
      });

      const result = await service.updateEngagement(TENANT, 'email-1', 'opened');

      expect(result.engagementStatus).toBe('opened');
      expect(prisma.emailRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            engagementStatus: 'opened',
            openedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('FR-010: updates engagement status to bounced', async () => {
      (prisma.emailRecord.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'email-1',
        engagementStatus: 'bounced',
        openedAt: null,
        clickedAt: null,
        bouncedAt: new Date(),
      });

      const result = await service.updateEngagement(TENANT, 'email-1', 'bounced');

      expect(result.engagementStatus).toBe('bounced');
      expect(prisma.emailRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ bouncedAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe('getUnmatchedEmails', () => {
    it('AC-010b: returns only unmatched emails', async () => {
      (prisma.emailRecord.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.emailRecord.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      await service.getUnmatchedEmails(TENANT);

      expect(prisma.emailRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT, isMatched: false },
        }),
      );
    });
  });

  describe('matchEmail', () => {
    it('AC-010b: matches an email to an account', async () => {
      (prisma.emailRecord.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'email-1',
        isMatched: true,
        accountId: ACCOUNT,
        contactId: null,
      });

      const result = await service.matchEmail(TENANT, 'email-1', ACCOUNT);

      expect(result.isMatched).toBe(true);
      expect(prisma.emailRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accountId: ACCOUNT,
            isMatched: true,
          }),
        }),
      );
    });
  });

  describe('listTemplates', () => {
    it('FR-010: returns active email templates', async () => {
      const templates = [
        {
          id: 'tpl-1',
          name: 'Follow Up',
          subjectTemplate: 'Follow up re: {{accountName}}',
          bodyTemplate: 'Hi {{contactName}}, ...',
          category: 'follow_up',
          mergeFields: ['accountName', 'contactName'],
          isActive: true,
        },
      ];
      (prisma.emailTemplate.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(templates);

      const result = await service.listTemplates(TENANT);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Follow Up');
      expect(prisma.emailTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT, isActive: true },
        }),
      );
    });
  });
});
