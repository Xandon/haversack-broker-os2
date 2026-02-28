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
import { useCreateTask, useUpdateTask } from '@/hooks/use-tasks';

const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(10000).optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  priority: z.enum(['high', 'medium', 'low']),
  assigneeId: z.string().min(1, 'Assignee is required'),
  accountId: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormData {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: string;
  assigneeId: string;
  accountId: string | null;
}

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string }>;
  task?: TaskFormData;
}

function formatDateTimeLocal(dateStr?: string): string {
  const date = dateStr ? new Date(dateStr) : new Date();
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function TaskFormDialog({
  open,
  onOpenChange,
  accounts,
  users,
  task,
}: TaskFormDialogProps): React.ReactElement {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const isEditing = Boolean(task);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      dueDate: formatDateTimeLocal(),
      priority: 'medium',
      assigneeId: '',
      accountId: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      if (task) {
        reset({
          title: task.title,
          description: task.description ?? '',
          dueDate: formatDateTimeLocal(task.dueDate),
          priority: task.priority,
          assigneeId: task.assigneeId,
          accountId: task.accountId ?? '',
        });
      } else {
        reset({
          title: '',
          description: '',
          dueDate: formatDateTimeLocal(),
          priority: 'medium',
          assigneeId: '',
          accountId: '',
        });
      }
    }
  }, [open, task, reset]);

  const onSubmit = async (values: TaskFormValues): Promise<void> => {
    const payload = {
      title: values.title,
      description: values.description || undefined,
      dueDate: new Date(values.dueDate).toISOString(),
      priority: values.priority,
      assigneeId: values.assigneeId,
      accountId: values.accountId || undefined,
    };

    if (task) {
      await updateTask.mutateAsync({ id: task.id, data: payload });
    } else {
      await createTask.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Task' : 'New Task'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the task details.' : 'Create a new task to track.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              placeholder="Enter task title…"
              {...register('title')}
              aria-invalid={errors.title ? 'true' : undefined}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              placeholder="Add a description…"
              rows={3}
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due Date</Label>
              <Input
                id="task-due-date"
                type="datetime-local"
                {...register('dueDate')}
                aria-invalid={errors.dueDate ? 'true' : undefined}
              />
              {errors.dueDate && (
                <p className="text-sm text-destructive">{errors.dueDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-priority">Priority</Label>
              <Select id="task-priority" {...register('priority')}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-assignee">Assignee</Label>
            <Select
              id="task-assignee"
              {...register('assigneeId')}
              aria-invalid={errors.assigneeId ? 'true' : undefined}
            >
              <option value="">Select assignee…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
            {errors.assigneeId && (
              <p className="text-sm text-destructive">{errors.assigneeId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-account">Account (optional)</Label>
            <Select id="task-account" {...register('accountId')}>
              <option value="">No account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>

          {(createTask.isError || updateTask.isError) && (
            <p className="text-sm text-destructive">
              Failed to save task. Please try again.
            </p>
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
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { TaskFormDialog };
