'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// -------------------------------------------------------------------
// Zod schema
// -------------------------------------------------------------------

const taskFormSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be 255 characters or fewer'),
  description: z.string().optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  priority: z.enum(['high', 'medium', 'low'], {
    errorMap: () => ({ message: 'Priority is required' }),
  }),
  assignedTo: z.string().min(1, 'Assigned user is required'),
  accountId: z.string().optional(),
  contactId: z.string().optional(),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface UserOption {
  id: string;
  name: string;
}

export interface AccountOption {
  id: string;
  name: string;
}

interface TaskFormProps {
  onSubmit: (values: TaskFormValues) => void;
  isLoading?: boolean;
  users?: UserOption[];
  accounts?: AccountOption[];
  initialValues?: Partial<TaskFormValues>;
}

// -------------------------------------------------------------------
// Priority options
// -------------------------------------------------------------------

const PRIORITY_OPTIONS = [
  { value: '', label: 'Select priority' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
] as const;

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export function TaskForm({
  onSubmit,
  isLoading = false,
  users = [],
  accounts = [],
  initialValues,
}: TaskFormProps): React.JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: initialValues?.title ?? '',
      description: initialValues?.description ?? '',
      dueDate: initialValues?.dueDate ?? '',
      priority: initialValues?.priority,
      assignedTo: initialValues?.assignedTo ?? '',
      accountId: initialValues?.accountId ?? '',
      contactId: initialValues?.contactId ?? '',
    },
  });

  const inputClasses =
    'block w-full min-h-[44px] rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500';

  const inputErrorClasses =
    'block w-full min-h-[44px] rounded-md border border-red-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500';

  const labelClasses = 'block text-sm font-medium text-gray-700';
  const errorClasses = 'mt-1 text-sm text-red-600';

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-4"
      aria-label="Task form"
    >
      {/* Title */}
      <div>
        <label htmlFor="task-title" className={labelClasses}>
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="task-title"
          type="text"
          {...register('title')}
          className={errors.title ? inputErrorClasses : inputClasses}
          placeholder="What needs to be done?"
          disabled={isLoading}
          aria-invalid={errors.title ? 'true' : 'false'}
          aria-describedby={errors.title ? 'title-error' : undefined}
        />
        {errors.title ? (
          <p id="title-error" className={errorClasses} role="alert">
            {errors.title.message}
          </p>
        ) : null}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="task-description" className={labelClasses}>
          Description
        </label>
        <textarea
          id="task-description"
          rows={3}
          {...register('description')}
          className="block w-full min-h-[44px] rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
          placeholder="Additional details (optional)"
          disabled={isLoading}
        />
      </div>

      {/* Due date and Priority — side by side on larger screens */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Due date */}
        <div>
          <label htmlFor="task-due-date" className={labelClasses}>
            Due date <span className="text-red-500">*</span>
          </label>
          <input
            id="task-due-date"
            type="date"
            {...register('dueDate')}
            className={errors.dueDate ? inputErrorClasses : inputClasses}
            disabled={isLoading}
            aria-invalid={errors.dueDate ? 'true' : 'false'}
            aria-describedby={errors.dueDate ? 'due-date-error' : undefined}
          />
          {errors.dueDate ? (
            <p id="due-date-error" className={errorClasses} role="alert">
              {errors.dueDate.message}
            </p>
          ) : null}
        </div>

        {/* Priority */}
        <div>
          <label htmlFor="task-priority" className={labelClasses}>
            Priority <span className="text-red-500">*</span>
          </label>
          <select
            id="task-priority"
            {...register('priority')}
            className={errors.priority ? inputErrorClasses : inputClasses}
            disabled={isLoading}
            aria-invalid={errors.priority ? 'true' : 'false'}
            aria-describedby={errors.priority ? 'priority-error' : undefined}
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.priority ? (
            <p id="priority-error" className={errorClasses} role="alert">
              {errors.priority.message}
            </p>
          ) : null}
        </div>
      </div>

      {/* Assigned to */}
      <div>
        <label htmlFor="task-assigned-to" className={labelClasses}>
          Assigned to <span className="text-red-500">*</span>
        </label>
        {users.length > 0 ? (
          <select
            id="task-assigned-to"
            {...register('assignedTo')}
            className={errors.assignedTo ? inputErrorClasses : inputClasses}
            disabled={isLoading}
            aria-invalid={errors.assignedTo ? 'true' : 'false'}
            aria-describedby={errors.assignedTo ? 'assigned-to-error' : undefined}
          >
            <option value="">Select user</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="task-assigned-to"
            type="text"
            {...register('assignedTo')}
            className={errors.assignedTo ? inputErrorClasses : inputClasses}
            placeholder="User ID"
            disabled={isLoading}
            aria-invalid={errors.assignedTo ? 'true' : 'false'}
            aria-describedby={errors.assignedTo ? 'assigned-to-error' : undefined}
          />
        )}
        {errors.assignedTo ? (
          <p id="assigned-to-error" className={errorClasses} role="alert">
            {errors.assignedTo.message}
          </p>
        ) : null}
      </div>

      {/* Link to account (optional) */}
      {accounts.length > 0 ? (
        <div>
          <label htmlFor="task-account" className={labelClasses}>
            Account
          </label>
          <select
            id="task-account"
            {...register('accountId')}
            className={inputClasses}
            disabled={isLoading}
          >
            <option value="">Link to account (optional)</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {/* Submit button */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : initialValues ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </form>
  );
}
