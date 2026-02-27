'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { ConditionBuilder } from './condition-builder';
import { ActionBuilder } from './action-builder';
import type {
  ConditionGroup,
  RuleAction,
  CreateRuleInput,
} from '@/hooks/use-business-rules';

const ENTITY_TYPES = ['Account', 'Order', 'Contact', 'Activity', 'Product', 'Opportunity'];

interface RuleFormProps {
  initialValues?: Partial<CreateRuleInput>;
  onSubmit: (values: CreateRuleInput) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel?: string;
}

export function RuleForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel = 'Create Rule',
}: RuleFormProps): React.ReactElement {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [entityType, setEntityType] = useState(initialValues?.entityType ?? 'Account');
  const [priority, setPriority] = useState(String(initialValues?.priority ?? 100));
  const [conditions, setConditions] = useState<ConditionGroup>(
    initialValues?.conditions ?? {
      logic: 'AND',
      conditions: [{ field: 'healthScore', operator: 'lt', value: 30 }],
    },
  );
  const [actions, setActions] = useState<RuleAction[]>(
    initialValues?.actions ?? [
      { type: 'send_notification', config: { recipient: 'assignedRep', title: '' } },
    ],
  );
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Rule name is required');
      return;
    }
    if (actions.length === 0) {
      setError('At least one action is required');
      return;
    }

    const priorityNum = parseInt(priority, 10);
    if (isNaN(priorityNum) || priorityNum < 1 || priorityNum > 1000) {
      setError('Priority must be between 1 and 1000');
      return;
    }

    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      entityType,
      conditions,
      actions,
      priority: priorityNum,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert" aria-live="polite">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rule Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Churn Alert"
              />
            </div>
            <div>
              <Label htmlFor="entityType">Entity Type</Label>
              <Select
                id="entityType"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
              >
                {ENTITY_TYPES.map((et) => (
                  <option key={et} value={et}>
                    {et}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <div className="w-32">
            <Label htmlFor="priority">Priority (1-1000)</Label>
            <Input
              id="priority"
              type="number"
              min={1}
              max={1000}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">IF (Conditions)</CardTitle>
        </CardHeader>
        <CardContent>
          <ConditionBuilder
            entityType={entityType}
            group={conditions}
            onChange={setConditions}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">THEN (Actions)</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionBuilder actions={actions} onChange={setActions} />
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="min-h-[44px]" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="min-h-[44px]" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
