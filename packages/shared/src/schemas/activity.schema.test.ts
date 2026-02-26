import { describe, test, expect } from 'vitest';
import {
  activityTypeSchema,
  createActivitySchema,
  updateActivitySchema,
  activityResponseSchema,
  activityListQuerySchema,
  activityMetricsQuerySchema,
  timelineQuerySchema,
  createDemoSchema,
} from './activity.schema';

describe('FR-007: Activity Zod schemas', () => {
  describe('activityTypeSchema', () => {
    test('FR-007: accepts all valid activity types', () => {
      expect(activityTypeSchema.parse('visit')).toBe('visit');
      expect(activityTypeSchema.parse('call')).toBe('call');
      expect(activityTypeSchema.parse('email')).toBe('email');
      expect(activityTypeSchema.parse('demo')).toBe('demo');
      expect(activityTypeSchema.parse('sampling')).toBe('sampling');
    });

    test('FR-007: rejects invalid activity type', () => {
      expect(() => activityTypeSchema.parse('meeting')).toThrow();
    });
  });

  describe('createDemoSchema', () => {
    test('FR-007: accepts valid demo with all fields', () => {
      const result = createDemoSchema.parse({
        productId: '00000000-0000-4000-a000-000000000001',
        quantitySampled: 5,
        buyerFeedback: 'Great product',
        outcome: 'positive',
      });
      expect(result.productId).toBe('00000000-0000-4000-a000-000000000001');
      expect(result.quantitySampled).toBe(5);
    });

    test('FR-007: accepts demo with only productId', () => {
      const result = createDemoSchema.parse({
        productId: '00000000-0000-4000-a000-000000000001',
      });
      expect(result.productId).toBe('00000000-0000-4000-a000-000000000001');
      expect(result.quantitySampled).toBeUndefined();
    });

    test('FR-007: rejects invalid outcome', () => {
      expect(() =>
        createDemoSchema.parse({
          productId: '00000000-0000-4000-a000-000000000001',
          outcome: 'excellent',
        }),
      ).toThrow();
    });

    test('FR-007: rejects negative quantity', () => {
      expect(() =>
        createDemoSchema.parse({
          productId: '00000000-0000-4000-a000-000000000001',
          quantitySampled: -1,
        }),
      ).toThrow();
    });
  });

  describe('createActivitySchema', () => {
    const validActivity = {
      accountId: '00000000-0000-4000-a000-000000000001',
      type: 'visit' as const,
      notes: 'Met with buyer',
      occurredAt: '2026-02-26T10:00:00.000Z',
      durationMinutes: 30,
    };

    test('FR-007: accepts valid visit activity', () => {
      const result = createActivitySchema.parse(validActivity);
      expect(result.type).toBe('visit');
      expect(result.notes).toBe('Met with buyer');
    });

    test('FR-007: accepts activity without optional fields', () => {
      const result = createActivitySchema.parse({
        accountId: '00000000-0000-4000-a000-000000000001',
        type: 'call',
        occurredAt: '2026-02-26T10:00:00.000Z',
      });
      expect(result.notes).toBeUndefined();
      expect(result.durationMinutes).toBeUndefined();
    });

    test('FR-007: accepts demo activity with demos array', () => {
      const result = createActivitySchema.parse({
        accountId: '00000000-0000-4000-a000-000000000001',
        type: 'demo',
        occurredAt: '2026-02-26T10:00:00.000Z',
        demos: [{ productId: '00000000-0000-4000-a000-000000000002' }],
      });
      expect(result.demos).toHaveLength(1);
    });

    test('FR-007: rejects demo activity without demos', () => {
      expect(() =>
        createActivitySchema.parse({
          accountId: '00000000-0000-4000-a000-000000000001',
          type: 'demo',
          occurredAt: '2026-02-26T10:00:00.000Z',
        }),
      ).toThrow(/Demo activities require at least one product/);
    });

    test('FR-007: rejects demo activity with empty demos array', () => {
      expect(() =>
        createActivitySchema.parse({
          accountId: '00000000-0000-4000-a000-000000000001',
          type: 'demo',
          occurredAt: '2026-02-26T10:00:00.000Z',
          demos: [],
        }),
      ).toThrow(/Demo activities require at least one product/);
    });

    test('FR-007: rejects notes exceeding 10000 characters', () => {
      expect(() =>
        createActivitySchema.parse({
          ...validActivity,
          notes: 'x'.repeat(10001),
        }),
      ).toThrow();
    });

    test('FR-007: rejects duration below 1', () => {
      expect(() =>
        createActivitySchema.parse({
          ...validActivity,
          durationMinutes: 0,
        }),
      ).toThrow();
    });

    test('FR-007: rejects duration above 1440', () => {
      expect(() =>
        createActivitySchema.parse({
          ...validActivity,
          durationMinutes: 1441,
        }),
      ).toThrow();
    });

    test('FR-007: rejects invalid UUID for accountId', () => {
      expect(() =>
        createActivitySchema.parse({
          ...validActivity,
          accountId: 'not-a-uuid',
        }),
      ).toThrow();
    });

    test('FR-007: rejects invalid datetime for occurredAt', () => {
      expect(() =>
        createActivitySchema.parse({
          ...validActivity,
          occurredAt: 'not-a-date',
        }),
      ).toThrow();
    });
  });

  describe('updateActivitySchema', () => {
    test('FR-007: accepts partial update', () => {
      const result = updateActivitySchema.parse({ notes: 'Updated notes' });
      expect(result.notes).toBe('Updated notes');
    });

    test('FR-007: accepts null for nullable fields', () => {
      const result = updateActivitySchema.parse({ notes: null, durationMinutes: null });
      expect(result.notes).toBeNull();
      expect(result.durationMinutes).toBeNull();
    });

    test('FR-007: accepts empty object', () => {
      const result = updateActivitySchema.parse({});
      expect(result).toEqual({});
    });
  });

  describe('activityResponseSchema', () => {
    test('FR-007: validates complete activity response', () => {
      const response = {
        id: '00000000-0000-4000-a000-000000000001',
        tenantId: '00000000-0000-4000-a000-000000000002',
        accountId: '00000000-0000-4000-a000-000000000003',
        userId: '00000000-0000-4000-a000-000000000004',
        type: 'visit',
        notes: 'Good meeting',
        occurredAt: '2026-02-26T10:00:00.000Z',
        durationMinutes: 30,
        version: 1,
        demos: [],
        createdAt: '2026-02-26T10:00:00.000Z',
        updatedAt: '2026-02-26T10:00:00.000Z',
      };
      const result = activityResponseSchema.parse(response);
      expect(result.type).toBe('visit');
    });

    test('FR-007: validates response with demo data', () => {
      const response = {
        id: '00000000-0000-4000-a000-000000000001',
        tenantId: '00000000-0000-4000-a000-000000000002',
        accountId: '00000000-0000-4000-a000-000000000003',
        userId: '00000000-0000-4000-a000-000000000004',
        type: 'demo',
        notes: null,
        occurredAt: '2026-02-26T10:00:00.000Z',
        durationMinutes: null,
        version: 1,
        demos: [
          {
            id: '00000000-0000-4000-a000-000000000005',
            productId: '00000000-0000-4000-a000-000000000006',
            quantitySampled: 5,
            buyerFeedback: 'Liked it',
            outcome: 'positive',
          },
        ],
        createdAt: '2026-02-26T10:00:00.000Z',
        updatedAt: '2026-02-26T10:00:00.000Z',
      };
      const result = activityResponseSchema.parse(response);
      expect(result.demos).toHaveLength(1);
    });
  });

  describe('activityListQuerySchema', () => {
    test('FR-008: accepts valid query with all params', () => {
      const result = activityListQuerySchema.parse({
        type: 'visit',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-12-31T23:59:59.000Z',
        cursor: '00000000-0000-4000-a000-000000000001',
        limit: '50',
      });
      expect(result.type).toBe('visit');
      expect(result.limit).toBe(50);
    });

    test('FR-008: defaults limit to 20', () => {
      const result = activityListQuerySchema.parse({});
      expect(result.limit).toBe(20);
    });

    test('FR-008: rejects limit above 100', () => {
      expect(() => activityListQuerySchema.parse({ limit: '101' })).toThrow();
    });
  });

  describe('activityMetricsQuerySchema', () => {
    test('FR-007: accepts valid metrics query', () => {
      const result = activityMetricsQuerySchema.parse({
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-12-31T23:59:59.000Z',
        groupBy: 'rep',
      });
      expect(result.groupBy).toBe('rep');
    });

    test('FR-007: defaults groupBy to rep', () => {
      const result = activityMetricsQuerySchema.parse({
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-12-31T23:59:59.000Z',
      });
      expect(result.groupBy).toBe('rep');
    });

    test('FR-007: requires startDate and endDate', () => {
      expect(() => activityMetricsQuerySchema.parse({})).toThrow();
    });
  });

  describe('timelineQuerySchema', () => {
    test('FR-008: accepts valid timeline query', () => {
      const result = timelineQuerySchema.parse({
        types: 'activity,email',
        activityType: 'visit',
        limit: '20',
      });
      expect(result.types).toBe('activity,email');
      expect(result.limit).toBe(20);
    });

    test('FR-008: defaults limit to 20', () => {
      const result = timelineQuerySchema.parse({});
      expect(result.limit).toBe(20);
    });
  });
});
