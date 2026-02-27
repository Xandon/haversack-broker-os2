'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RuleList } from '@/components/business-rules/rule-list';
import {
  useBusinessRules,
  useUpdateRule,
  useDeleteRule,
} from '@/hooks/use-business-rules';

export default function BusinessRulesPage(): React.ReactElement {
  const router = useRouter();
  const { data: rules, isLoading } = useBusinessRules();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();

  function handleEdit(id: string): void {
    router.push(`/admin/rules/${id}`);
  }

  function handleDelete(id: string): void {
    if (confirm('Are you sure you want to delete this rule?')) {
      deleteRule.mutate(id);
    }
  }

  function handleToggleStatus(id: string, newStatus: 'active' | 'inactive'): void {
    updateRule.mutate({ id, input: { status: newStatus } });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Business Rules</h1>
          <p className="text-sm text-muted-foreground">
            Configure automated IF/THEN rules for your business processes.
          </p>
        </div>
        <Button onClick={() => router.push('/admin/rules/new')}>
          Create Rule
        </Button>
      </div>

      <RuleList
        rules={rules}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
      />
    </div>
  );
}
