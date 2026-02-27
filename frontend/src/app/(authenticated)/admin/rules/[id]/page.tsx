'use client';

import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { RuleForm } from '@/components/business-rules/rule-form';
import {
  useBusinessRule,
  useUpdateRule,
  type CreateRuleInput,
} from '@/hooks/use-business-rules';

export default function EditRulePage(): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const ruleId = params['id'] as string;
  const { data: rule, isLoading } = useBusinessRule(ruleId);
  const updateRule = useUpdateRule();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!rule) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Rule not found.</p>
      </div>
    );
  }

  function handleSubmit(values: CreateRuleInput): void {
    updateRule.mutate(
      { id: ruleId, input: values },
      {
        onSuccess: () => {
          router.push('/admin/rules');
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Rule: {rule.name}</h1>
        <p className="text-sm text-muted-foreground">
          Modify conditions and actions for this business rule.
        </p>
      </div>

      <RuleForm
        initialValues={{
          name: rule.name,
          description: rule.description ?? undefined,
          entityType: rule.entityType,
          conditions: rule.conditions,
          actions: rule.actions,
          priority: rule.priority,
        }}
        onSubmit={handleSubmit}
        onCancel={() => router.push('/admin/rules')}
        isSubmitting={updateRule.isPending}
        submitLabel="Update Rule"
      />
    </div>
  );
}
