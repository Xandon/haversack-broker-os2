'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { DemoFields, type DemoEntry } from './demo-fields';
import { useCreateActivity } from '@/hooks/use-activities';

const activityFormSchema = z.object({
  accountId: z.string().min(1, 'Account is required'),
  type: z.enum(['visit', 'call', 'email', 'demo', 'sampling']),
  notes: z.string().max(10000).optional(),
  occurredAt: z.string().min(1, 'Date/time is required'),
  durationMinutes: z.coerce.number().int().min(1).max(1440).optional(),
});

type ActivityFormValues = z.infer<typeof activityFormSchema>;

interface ActivityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Array<{ id: string; name: string }>;
  defaultAccountId?: string;
}

function formatDateTimeLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function ActivityFormDialog({
  open,
  onOpenChange,
  accounts,
  defaultAccountId,
}: ActivityFormDialogProps): React.ReactElement {
  const createActivity = useCreateActivity();
  const [demos, setDemos] = React.useState<DemoEntry[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      accountId: defaultAccountId ?? '',
      type: 'visit',
      notes: '',
      occurredAt: formatDateTimeLocal(),
      durationMinutes: undefined,
    },
  });

  const activityType = watch('type');

  React.useEffect(() => {
    if (open) {
      reset({
        accountId: defaultAccountId ?? '',
        type: 'visit',
        notes: '',
        occurredAt: formatDateTimeLocal(),
        durationMinutes: undefined,
      });
      setDemos([]);
    }
  }, [open, defaultAccountId, reset]);

  const onSubmit = async (values: ActivityFormValues): Promise<void> => {
    const input = {
      accountId: values.accountId,
      type: values.type,
      notes: values.notes || undefined,
      occurredAt: new Date(values.occurredAt).toISOString(),
      durationMinutes: values.durationMinutes || undefined,
      demos:
        values.type === 'demo' && demos.length > 0
          ? demos.map((d) => ({
              productId: d.productId,
              quantitySampled: d.quantitySampled || undefined,
              buyerFeedback: d.buyerFeedback || undefined,
              outcome: d.outcome || undefined,
            }))
          : undefined,
    };

    await createActivity.mutateAsync(input);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
          <DialogDescription>
            Record a new activity for an account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activity-account">Account</Label>
            <Select
              id="activity-account"
              {...register('accountId')}
              aria-invalid={errors.accountId ? 'true' : undefined}
            >
              <option value="">Select account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
            {errors.accountId && (
              <p className="text-sm text-destructive">{errors.accountId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="activity-type">Type</Label>
            <Select id="activity-type" {...register('type')}>
              <option value="visit">Visit</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="demo">Demo</option>
              <option value="sampling">Sampling</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="activity-date">Date & Time</Label>
              <Input
                id="activity-date"
                type="datetime-local"
                {...register('occurredAt')}
                aria-invalid={errors.occurredAt ? 'true' : undefined}
              />
              {errors.occurredAt && (
                <p className="text-sm text-destructive">{errors.occurredAt.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-duration">Duration (min)</Label>
              <Input
                id="activity-duration"
                type="number"
                min={1}
                max={1440}
                placeholder="Optional"
                {...register('durationMinutes')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="activity-notes">Notes</Label>
            <Textarea
              id="activity-notes"
              placeholder="Add notes about this activity…"
              rows={3}
              {...register('notes')}
            />
          </div>

          {activityType === 'demo' && (
            <DemoFields demos={demos} onChange={setDemos} />
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Log Activity'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { ActivityFormDialog };
