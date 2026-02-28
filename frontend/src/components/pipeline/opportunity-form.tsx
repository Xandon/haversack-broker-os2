'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createOpportunitySchema } from '@haversack/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export interface OpportunityFormData {
  name: string;
  estimatedValue: number;
  expectedCloseDate: string;
  stage: string;
  accountId: string;
  probability: number;
}

export interface OpportunityFormProps {
  mode: 'create' | 'edit';
  defaultValues?: Partial<OpportunityFormData>;
  onSubmit: (data: OpportunityFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function OpportunityForm({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: OpportunityFormProps): React.ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OpportunityFormData>({
    resolver: zodResolver(
      createOpportunitySchema.pick({
        name: true,
        estimatedValue: true,
        expectedCloseDate: true,
        stage: true,
        accountId: true,
        probability: true,
      }),
    ),
    defaultValues: {
      name: '',
      estimatedValue: 0,
      expectedCloseDate: new Date().toISOString().split('T')[0],
      stage: 'prospect',
      accountId: '',
      probability: 10,
      ...defaultValues,
    },
  });

  const handleFormSubmit = handleSubmit((data: OpportunityFormData) => {
    onSubmit(data);
  });

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{mode === 'create' ? 'New Opportunity' : 'Edit Opportunity'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              {...register('name')}
              aria-invalid={Boolean(errors.name)}
              placeholder="e.g., Q1 Expansion Order"
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="estimatedValue">
                Estimated Value ($) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="estimatedValue"
                type="number"
                min="0"
                {...register('estimatedValue', { valueAsNumber: true })}
                placeholder="10000"
              />
              {errors.estimatedValue && (
                <p className="text-sm text-destructive">{errors.estimatedValue.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedCloseDate">
                Expected Close Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="expectedCloseDate"
                type="date"
                {...register('expectedCloseDate')}
              />
              {errors.expectedCloseDate && (
                <p className="text-sm text-destructive">{errors.expectedCloseDate.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stage">
                Stage <span className="text-destructive">*</span>
              </Label>
              <Select id="stage" {...register('stage')}>
                <option value="prospect">Prospect</option>
                <option value="qualified">Qualified</option>
                <option value="proposal">Proposal</option>
                <option value="negotiation">Negotiation</option>
              </Select>
              {errors.stage && <p className="text-sm text-destructive">{errors.stage.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="probability">Probability (%)</Label>
              <Input
                id="probability"
                type="number"
                min="0"
                max="100"
                {...register('probability', { valueAsNumber: true })}
                placeholder="10"
              />
              {errors.probability && (
                <p className="text-sm text-destructive">{errors.probability.message}</p>
              )}
            </div>
          </div>

          {mode === 'create' && (
            <div className="space-y-2">
              <Label htmlFor="accountId">
                Account ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="accountId"
                {...register('accountId')}
                placeholder="Account UUID"
              />
              {errors.accountId && (
                <p className="text-sm text-destructive">{errors.accountId.message}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Opportunity' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
