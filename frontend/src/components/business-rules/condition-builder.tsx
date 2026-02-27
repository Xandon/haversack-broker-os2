'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { Condition, ConditionGroup } from '@/hooks/use-business-rules';
import { isConditionGroup } from '@/hooks/use-business-rules';

const ENTITY_FIELDS: Record<string, string[]> = {
  Account: ['name', 'accountType', 'healthScore', 'territory', 'totalRevenue', 'lastOrderDate', 'status'],
  Order: ['total', 'status', 'orderNumber', 'lineItemCount', 'createdAt'],
  Contact: ['firstName', 'lastName', 'email', 'phone', 'isPrimary', 'title'],
  Activity: ['type', 'outcome', 'duration', 'createdAt'],
  Product: ['name', 'sku', 'wholesalePrice', 'isActive', 'category'],
  Opportunity: ['stage', 'estimatedValue', 'probability', 'expectedCloseDate'],
};

const OPERATORS = [
  { value: 'eq', label: '=' },
  { value: 'neq', label: '!=' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'contains', label: 'contains' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'is_null', label: 'is null' },
  { value: 'is_not_null', label: 'is not null' },
  { value: 'gt_days_ago', label: '> days ago' },
];

interface ConditionBuilderProps {
  entityType: string;
  group: ConditionGroup;
  onChange: (group: ConditionGroup) => void;
  depth?: number;
}

export function ConditionBuilder({
  entityType,
  group,
  onChange,
  depth = 0,
}: ConditionBuilderProps): React.ReactElement {
  const fields = ENTITY_FIELDS[entityType] ?? [];

  function updateLogic(logic: 'AND' | 'OR'): void {
    onChange({ ...group, logic });
  }

  function addCondition(): void {
    const newCondition: Condition = {
      field: fields[0] ?? 'name',
      operator: 'eq',
      value: '',
    };
    onChange({ ...group, conditions: [...group.conditions, newCondition] });
  }

  function addGroup(): void {
    const newGroup: ConditionGroup = {
      logic: 'AND',
      conditions: [{ field: fields[0] ?? 'name', operator: 'eq', value: '' }],
    };
    onChange({ ...group, conditions: [...group.conditions, newGroup] });
  }

  function removeCondition(index: number): void {
    const updated = group.conditions.filter((_, i) => i !== index);
    onChange({ ...group, conditions: updated });
  }

  function updateCondition(index: number, updated: Condition | ConditionGroup): void {
    const conditions = [...group.conditions];
    conditions[index] = updated;
    onChange({ ...group, conditions });
  }

  return (
    <div
      className={`space-y-3 rounded-lg border p-3 ${depth > 0 ? 'ml-4 border-dashed' : ''}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Match</span>
        <Select
          className="w-24"
          value={group.logic}
          onChange={(e) => updateLogic(e.target.value as 'AND' | 'OR')}
        >
          <option value="AND">All (AND)</option>
          <option value="OR">Any (OR)</option>
        </Select>
        <span className="text-sm text-muted-foreground">of the following conditions:</span>
      </div>

      {group.conditions.map((item, index) => {
        if (isConditionGroup(item)) {
          return (
            <div key={index} className="relative">
              <Button
                variant="outline"
                size="sm"
                className="absolute -right-1 -top-1 h-6 w-6 rounded-full p-0 text-xs"
                onClick={() => removeCondition(index)}
              >
                x
              </Button>
              <ConditionBuilder
                entityType={entityType}
                group={item}
                onChange={(updated) => updateCondition(index, updated)}
                depth={depth + 1}
              />
            </div>
          );
        }

        return (
          <ConditionRow
            key={index}
            fields={fields}
            condition={item}
            onChange={(updated) => updateCondition(index, updated)}
            onRemove={() => removeCondition(index)}
            canRemove={group.conditions.length > 1}
          />
        );
      })}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="min-h-[44px]" onClick={addCondition} aria-label="Add condition">
          + Condition
        </Button>
        {depth < 2 && (
          <Button variant="outline" size="sm" className="min-h-[44px]" onClick={addGroup} aria-label="Add condition group">
            + Group
          </Button>
        )}
      </div>
    </div>
  );
}

interface ConditionRowProps {
  fields: string[];
  condition: Condition;
  onChange: (condition: Condition) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function ConditionRow({
  fields,
  condition,
  onChange,
  onRemove,
  canRemove,
}: ConditionRowProps): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        className="w-40"
        value={condition.field}
        onChange={(e) => onChange({ ...condition, field: e.target.value })}
        aria-label="Condition field"
      >
        {fields.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </Select>

      <Select
        className="w-32"
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value })}
        aria-label="Condition operator"
      >
        {OPERATORS.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </Select>

      {condition.operator !== 'is_null' && condition.operator !== 'is_not_null' && (
        <Input
          className="w-40"
          value={String(condition.value ?? '')}
          onChange={(e) => {
            const raw = e.target.value;
            const numVal = Number(raw);
            const value = raw !== '' && !isNaN(numVal) ? numVal : raw;
            onChange({ ...condition, value });
          }}
          placeholder="Value"
        />
      )}

      {canRemove && (
        <Button
          variant="outline"
          size="sm"
          className="h-11 w-11 p-0"
          onClick={onRemove}
          aria-label="Remove condition"
        >
          x
        </Button>
      )}
    </div>
  );
}
