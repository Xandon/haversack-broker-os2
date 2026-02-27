/**
 * Business Rule Condition Evaluator (FR-028)
 *
 * Evaluates IF conditions with AND/OR logic against entity field values.
 * Condition schema:
 * {
 *   logic: 'AND' | 'OR',
 *   conditions: [
 *     { field: 'healthScore', operator: 'lt', value: 30 },
 *     { field: 'lastOrderDate', operator: 'gt_days_ago', value: 60 },
 *   ]
 * }
 */

export interface Condition {
  field: string;
  operator: string;
  value: unknown;
}

export interface ConditionGroup {
  logic: 'AND' | 'OR';
  conditions: Array<Condition | ConditionGroup>;
}

const VALID_ENTITY_TYPES = ['Account', 'Order', 'Contact', 'Activity', 'Product', 'Opportunity'];

const ENTITY_FIELDS: Record<string, Set<string>> = {
  Account: new Set([
    'name', 'accountType', 'email', 'phone', 'city', 'state', 'zipCode',
    'healthScore', 'lastActivityDate', 'lastOrderDate', 'createdAt', 'updatedAt',
  ]),
  Order: new Set([
    'status', 'total', 'subtotal', 'orderNumber', 'createdAt', 'confirmedAt',
  ]),
  Contact: new Set([
    'firstName', 'lastName', 'email', 'phone', 'title', 'isPrimary',
  ]),
  Activity: new Set([
    'activityType', 'subject', 'occurredAt', 'duration', 'createdAt',
  ]),
  Product: new Set([
    'name', 'sku', 'unitPrice', 'availabilityStatus', 'isActive',
  ]),
  Opportunity: new Set([
    'stage', 'estimatedValue', 'probability', 'expectedCloseDate', 'isActive',
  ]),
};

const VALID_OPERATORS = new Set([
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
  'contains', 'not_contains', 'starts_with', 'ends_with',
  'in', 'not_in',
  'is_null', 'is_not_null',
  'gt_days_ago', 'lt_days_ago',
]);

export function validateConditions(
  entityType: string,
  conditionGroup: ConditionGroup,
): string[] {
  const errors: string[] = [];

  if (!VALID_ENTITY_TYPES.includes(entityType)) {
    errors.push(`Invalid entity type: ${entityType}`);
    return errors;
  }

  if (!conditionGroup.logic || !['AND', 'OR'].includes(conditionGroup.logic)) {
    errors.push('Condition group must have logic: "AND" or "OR"');
  }

  if (!Array.isArray(conditionGroup.conditions) || conditionGroup.conditions.length === 0) {
    errors.push('Condition group must have at least one condition');
  }

  for (const condition of conditionGroup.conditions ?? []) {
    if ('logic' in condition) {
      // Nested group
      errors.push(...validateConditions(entityType, condition as ConditionGroup));
    } else {
      const c = condition as Condition;
      const fields = ENTITY_FIELDS[entityType];
      if (fields && !fields.has(c.field)) {
        errors.push(`Field '${entityType}.${c.field}' does not exist`);
      }
      if (!VALID_OPERATORS.has(c.operator)) {
        errors.push(`Invalid operator: ${c.operator}`);
      }
    }
  }

  return errors;
}

export function evaluateConditions(
  conditionGroup: ConditionGroup,
  entityData: Record<string, unknown>,
): boolean {
  const results = conditionGroup.conditions.map((condition) => {
    if ('logic' in condition) {
      return evaluateConditions(condition as ConditionGroup, entityData);
    }
    return evaluateSingleCondition(condition as Condition, entityData);
  });

  if (conditionGroup.logic === 'AND') {
    return results.every(Boolean);
  }
  return results.some(Boolean);
}

function evaluateSingleCondition(
  condition: Condition,
  entityData: Record<string, unknown>,
): boolean {
  const fieldValue = entityData[condition.field];
  const targetValue = condition.value;

  switch (condition.operator) {
    case 'eq':
      return fieldValue === targetValue;
    case 'neq':
      return fieldValue !== targetValue;
    case 'gt':
      return typeof fieldValue === 'number' && typeof targetValue === 'number' && fieldValue > targetValue;
    case 'gte':
      return typeof fieldValue === 'number' && typeof targetValue === 'number' && fieldValue >= targetValue;
    case 'lt':
      return typeof fieldValue === 'number' && typeof targetValue === 'number' && fieldValue < targetValue;
    case 'lte':
      return typeof fieldValue === 'number' && typeof targetValue === 'number' && fieldValue <= targetValue;
    case 'contains':
      return typeof fieldValue === 'string' && typeof targetValue === 'string' && fieldValue.includes(targetValue);
    case 'not_contains':
      return typeof fieldValue === 'string' && typeof targetValue === 'string' && !fieldValue.includes(targetValue);
    case 'starts_with':
      return typeof fieldValue === 'string' && typeof targetValue === 'string' && fieldValue.startsWith(targetValue);
    case 'ends_with':
      return typeof fieldValue === 'string' && typeof targetValue === 'string' && fieldValue.endsWith(targetValue);
    case 'in':
      return Array.isArray(targetValue) && targetValue.includes(fieldValue);
    case 'not_in':
      return Array.isArray(targetValue) && !targetValue.includes(fieldValue);
    case 'is_null':
      return fieldValue === null || fieldValue === undefined;
    case 'is_not_null':
      return fieldValue !== null && fieldValue !== undefined;
    case 'gt_days_ago': {
      if (!(fieldValue instanceof Date) && typeof fieldValue !== 'string') return false;
      const date = new Date(fieldValue as string | Date);
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - (targetValue as number));
      return date < daysAgo;
    }
    case 'lt_days_ago': {
      if (!(fieldValue instanceof Date) && typeof fieldValue !== 'string') return false;
      const date = new Date(fieldValue as string | Date);
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - (targetValue as number));
      return date > daysAgo;
    }
    default:
      return false;
  }
}
