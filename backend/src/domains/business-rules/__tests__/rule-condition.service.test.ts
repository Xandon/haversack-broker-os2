import { describe, test, expect } from 'vitest';
import { validateConditions, evaluateConditions, type ConditionGroup } from '../rule-condition.service';

describe('FR-028: Rule condition service', () => {
  describe('validateConditions', () => {
    test('FR-028: accepts valid Account conditions', () => {
      const conditions: ConditionGroup = {
        logic: 'AND',
        conditions: [
          { field: 'healthScore', operator: 'lt', value: 30 },
          { field: 'name', operator: 'contains', value: 'test' },
        ],
      };
      const errors = validateConditions('Account', conditions);
      expect(errors).toEqual([]);
    });

    test('AC-028b: rejects non-existent field', () => {
      const conditions: ConditionGroup = {
        logic: 'AND',
        conditions: [
          { field: 'foobar', operator: 'eq', value: 'test' },
        ],
      };
      const errors = validateConditions('Account', conditions);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("Field 'Account.foobar' does not exist");
    });

    test('FR-028: rejects invalid entity type', () => {
      const conditions: ConditionGroup = {
        logic: 'AND',
        conditions: [{ field: 'name', operator: 'eq', value: 'test' }],
      };
      const errors = validateConditions('InvalidEntity', conditions);
      expect(errors[0]).toContain('Invalid entity type');
    });

    test('FR-028: rejects invalid operator', () => {
      const conditions: ConditionGroup = {
        logic: 'AND',
        conditions: [
          { field: 'name', operator: 'invalid_op', value: 'test' },
        ],
      };
      const errors = validateConditions('Account', conditions);
      expect(errors.some((e) => e.includes('Invalid operator'))).toBe(true);
    });

    test('FR-028: validates nested condition groups', () => {
      const conditions: ConditionGroup = {
        logic: 'OR',
        conditions: [
          {
            logic: 'AND',
            conditions: [
              { field: 'healthScore', operator: 'lt', value: 30 },
              { field: 'accountType', operator: 'eq', value: 'retail' },
            ],
          },
          { field: 'name', operator: 'contains', value: 'VIP' },
        ],
      };
      const errors = validateConditions('Account', conditions);
      expect(errors).toEqual([]);
    });

    test('FR-028: rejects empty conditions array', () => {
      const conditions: ConditionGroup = {
        logic: 'AND',
        conditions: [],
      };
      const errors = validateConditions('Account', conditions);
      expect(errors.some((e) => e.includes('at least one condition'))).toBe(true);
    });

    test('FR-028: validates Order entity conditions', () => {
      const conditions: ConditionGroup = {
        logic: 'AND',
        conditions: [
          { field: 'total', operator: 'gte', value: 5000 },
          { field: 'status', operator: 'eq', value: 'confirmed' },
        ],
      };
      const errors = validateConditions('Order', conditions);
      expect(errors).toEqual([]);
    });
  });

  describe('evaluateConditions', () => {
    test('FR-028: AND logic — all conditions must match', () => {
      const conditions: ConditionGroup = {
        logic: 'AND',
        conditions: [
          { field: 'healthScore', operator: 'lt', value: 30 },
          { field: 'accountType', operator: 'eq', value: 'retail' },
        ],
      };
      expect(evaluateConditions(conditions, { healthScore: 25, accountType: 'retail' })).toBe(true);
      expect(evaluateConditions(conditions, { healthScore: 50, accountType: 'retail' })).toBe(false);
      expect(evaluateConditions(conditions, { healthScore: 25, accountType: 'restaurant' })).toBe(false);
    });

    test('FR-028: OR logic — any condition can match', () => {
      const conditions: ConditionGroup = {
        logic: 'OR',
        conditions: [
          { field: 'healthScore', operator: 'lt', value: 30 },
          { field: 'accountType', operator: 'eq', value: 'VIP' },
        ],
      };
      expect(evaluateConditions(conditions, { healthScore: 25, accountType: 'regular' })).toBe(true);
      expect(evaluateConditions(conditions, { healthScore: 50, accountType: 'VIP' })).toBe(true);
      expect(evaluateConditions(conditions, { healthScore: 50, accountType: 'regular' })).toBe(false);
    });

    test('FR-028: evaluates comparison operators correctly', () => {
      expect(evaluateConditions(
        { logic: 'AND', conditions: [{ field: 'score', operator: 'gt', value: 50 }] },
        { score: 51 },
      )).toBe(true);
      expect(evaluateConditions(
        { logic: 'AND', conditions: [{ field: 'score', operator: 'gte', value: 50 }] },
        { score: 50 },
      )).toBe(true);
      expect(evaluateConditions(
        { logic: 'AND', conditions: [{ field: 'score', operator: 'lte', value: 50 }] },
        { score: 50 },
      )).toBe(true);
    });

    test('FR-028: evaluates string operators correctly', () => {
      expect(evaluateConditions(
        { logic: 'AND', conditions: [{ field: 'name', operator: 'contains', value: 'test' }] },
        { name: 'my test account' },
      )).toBe(true);
      expect(evaluateConditions(
        { logic: 'AND', conditions: [{ field: 'name', operator: 'starts_with', value: 'Portland' }] },
        { name: 'Portland Grocery' },
      )).toBe(true);
    });

    test('FR-028: evaluates null check operators', () => {
      expect(evaluateConditions(
        { logic: 'AND', conditions: [{ field: 'email', operator: 'is_null', value: null }] },
        { email: null },
      )).toBe(true);
      expect(evaluateConditions(
        { logic: 'AND', conditions: [{ field: 'email', operator: 'is_not_null', value: null }] },
        { email: 'test@test.com' },
      )).toBe(true);
    });

    test('FR-028: evaluates in/not_in operators', () => {
      expect(evaluateConditions(
        { logic: 'AND', conditions: [{ field: 'status', operator: 'in', value: ['active', 'pending'] }] },
        { status: 'active' },
      )).toBe(true);
      expect(evaluateConditions(
        { logic: 'AND', conditions: [{ field: 'status', operator: 'not_in', value: ['cancelled', 'rejected'] }] },
        { status: 'active' },
      )).toBe(true);
    });

    test('FR-028: evaluates gt_days_ago operator', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 90);

      expect(evaluateConditions(
        { logic: 'AND', conditions: [{ field: 'lastOrderDate', operator: 'gt_days_ago', value: 60 }] },
        { lastOrderDate: thirtyDaysAgo.toISOString() },
      )).toBe(true);
    });

    test('FR-028: evaluates nested groups', () => {
      const conditions: ConditionGroup = {
        logic: 'OR',
        conditions: [
          {
            logic: 'AND',
            conditions: [
              { field: 'healthScore', operator: 'lt', value: 30 },
              { field: 'accountType', operator: 'eq', value: 'retail' },
            ],
          },
          { field: 'name', operator: 'contains', value: 'VIP' },
        ],
      };

      // First group matches
      expect(evaluateConditions(conditions, { healthScore: 20, accountType: 'retail', name: 'regular' })).toBe(true);
      // Second condition matches
      expect(evaluateConditions(conditions, { healthScore: 80, accountType: 'restaurant', name: 'VIP Customer' })).toBe(true);
      // Neither matches
      expect(evaluateConditions(conditions, { healthScore: 80, accountType: 'restaurant', name: 'regular' })).toBe(false);
    });
  });
});
