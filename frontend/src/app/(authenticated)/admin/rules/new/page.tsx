'use client';

import { useRouter } from 'next/navigation';
import { RuleForm } from '@/components/business-rules/rule-form';
import { useCreateRule, type CreateRuleInput } from '@/hooks/use-business-rules';

export default function NewRulePage(): React.ReactElement {
  const router = useRouter();
  const createRule = useCreateRule();

  function handleSubmit(values: CreateRuleInput): void {
    createRule.mutate(values, {
      onSuccess: () => {
        router.push('/admin/rules');
      },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create Business Rule</h1>
        <p className="text-sm text-muted-foreground">
          Define conditions and actions for automated rule execution.
        </p>
      </div>

      <RuleForm
        onSubmit={handleSubmit}
        onCancel={() => router.push('/admin/rules')}
        isSubmitting={createRule.isPending}
      />
    </div>
  );
}
