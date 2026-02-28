'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/patterns/page-header';
import { OpportunityForm } from '@/components/pipeline/opportunity-form';
import { useCreateOpportunity } from '@/hooks/use-opportunity-mutations';
import { toast } from 'sonner';
import type { OpportunityFormData } from '@/components/pipeline/opportunity-form';

export default function NewOpportunityPage(): React.ReactElement {
  const router = useRouter();
  const createOpportunity = useCreateOpportunity();

  function handleSubmit(data: OpportunityFormData): void {
    createOpportunity.mutate(data, {
      onSuccess: () => {
        toast.success('Opportunity created');
        router.push('/opportunities');
      },
      onError: () => {
        toast.error('Failed to create opportunity');
      },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Opportunity"
        breadcrumbs={[
          { label: 'Pipeline', href: '/opportunities' },
          { label: 'New Opportunity' },
        ]}
      />
      <OpportunityForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.push('/opportunities')}
        isSubmitting={createOpportunity.isPending}
      />
    </div>
  );
}
