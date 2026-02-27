'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { RuleAction } from '@/hooks/use-business-rules';

const ACTION_TYPES = [
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'update_field', label: 'Update Field' },
  { value: 'create_task', label: 'Create Task' },
  { value: 'send_email', label: 'Send Email' },
] as const;

interface ActionBuilderProps {
  actions: RuleAction[];
  onChange: (actions: RuleAction[]) => void;
}

export function ActionBuilder({
  actions,
  onChange,
}: ActionBuilderProps): React.ReactElement {
  function addAction(): void {
    onChange([
      ...actions,
      { type: 'send_notification', config: { recipient: 'assignedRep', title: '' } },
    ]);
  }

  function removeAction(index: number): void {
    onChange(actions.filter((_, i) => i !== index));
  }

  function updateAction(index: number, updated: RuleAction): void {
    const copy = [...actions];
    copy[index] = updated;
    onChange(copy);
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">THEN (Actions)</Label>

      {actions.map((action, index) => (
        <ActionRow
          key={index}
          action={action}
          onChange={(updated) => updateAction(index, updated)}
          onRemove={() => removeAction(index)}
          canRemove={actions.length > 1}
        />
      ))}

      <Button variant="outline" size="sm" onClick={addAction}>
        + Action
      </Button>
    </div>
  );
}

interface ActionRowProps {
  action: RuleAction;
  onChange: (action: RuleAction) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function ActionRow({
  action,
  onChange,
  onRemove,
  canRemove,
}: ActionRowProps): React.ReactElement {
  function updateConfig(key: string, value: string): void {
    onChange({ ...action, config: { ...action.config, [key]: value } });
  }

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Select
          className="w-48"
          value={action.type}
          onChange={(e) =>
            onChange({ type: e.target.value as RuleAction['type'], config: getDefaultConfig(e.target.value) })
          }
        >
          {ACTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>

        {canRemove && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-8 w-8 p-0"
            onClick={onRemove}
          >
            x
          </Button>
        )}
      </div>

      {action.type === 'send_notification' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Recipient</Label>
            <Select
              value={(action.config['recipient'] as string) ?? 'assignedRep'}
              onChange={(e) => updateConfig('recipient', e.target.value)}
            >
              <option value="assignedRep">Assigned Rep</option>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              value={(action.config['title'] as string) ?? ''}
              onChange={(e) => updateConfig('title', e.target.value)}
              placeholder="Notification title"
            />
          </div>
        </div>
      )}

      {action.type === 'update_field' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Field</Label>
            <Input
              value={(action.config['field'] as string) ?? ''}
              onChange={(e) => updateConfig('field', e.target.value)}
              placeholder="Field name"
            />
          </div>
          <div>
            <Label className="text-xs">Value</Label>
            <Input
              value={(action.config['value'] as string) ?? ''}
              onChange={(e) => updateConfig('value', e.target.value)}
              placeholder="New value"
            />
          </div>
        </div>
      )}

      {action.type === 'create_task' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Task Title</Label>
            <Input
              value={(action.config['title'] as string) ?? ''}
              onChange={(e) => updateConfig('title', e.target.value)}
              placeholder="Task title"
            />
          </div>
          <div>
            <Label className="text-xs">Due In (days)</Label>
            <Input
              type="number"
              value={(action.config['dueDays'] as string) ?? '7'}
              onChange={(e) => updateConfig('dueDays', e.target.value)}
              placeholder="7"
            />
          </div>
        </div>
      )}

      {action.type === 'send_email' && (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Subject</Label>
            <Input
              value={(action.config['subject'] as string) ?? ''}
              onChange={(e) => updateConfig('subject', e.target.value)}
              placeholder="Email subject"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function getDefaultConfig(type: string): Record<string, unknown> {
  switch (type) {
    case 'send_notification':
      return { recipient: 'assignedRep', title: '' };
    case 'update_field':
      return { field: '', value: '' };
    case 'create_task':
      return { title: '', dueDays: '7', recipient: 'assignedRep' };
    case 'send_email':
      return { subject: '' };
    default:
      return {};
  }
}
