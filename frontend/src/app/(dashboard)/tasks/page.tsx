'use client';

import { useCallback, useState } from 'react';
import { clsx } from 'clsx';

import { useTasks, useCompleteTask, type TaskStatus } from '@/hooks/use-tasks';
import { SkeletonLoader } from '@/components/shared/skeleton-loader';
import { EmptyState } from '@/components/shared/empty-state';
import { TaskForm, type TaskFormValues } from '@/components/forms/task-form';
import { useCreateTask } from '@/hooks/use-tasks';

// -------------------------------------------------------------------
// Status filter options
// -------------------------------------------------------------------

const STATUS_FILTERS: Array<{ value: TaskStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function isOverdue(dueDateStr: string, status: TaskStatus): boolean {
  if (status === 'completed' || status === 'cancelled') {
    return false;
  }
  const dueDate = new Date(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
}

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getPriorityBadgeClasses(priority: string): string {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700';
    case 'low':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-gray-100 text-gray-700';
    case 'in_progress':
      return 'bg-blue-100 text-blue-700';
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'cancelled':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

// -------------------------------------------------------------------
// Page Component
// -------------------------------------------------------------------

export default function TasksPage(): React.JSX.Element {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const filters = {
    status: statusFilter === 'all' ? undefined : statusFilter,
    sort_by: 'due_date' as const,
    sort_order: 'asc' as const,
  };

  const { tasks, isLoading, isError, error } = useTasks(filters);
  const { completeTask, isPending: isCompleting } = useCompleteTask();
  const { createTaskAsync, isPending: isCreating } = useCreateTask();

  const handleComplete = useCallback(
    (taskId: string): void => {
      completeTask(taskId);
    },
    [completeTask],
  );

  const handleCreateTask = useCallback(
    async (values: TaskFormValues): Promise<void> => {
      await createTaskAsync({
        title: values.title,
        description: values.description,
        due_date: values.dueDate,
        priority: values.priority,
        assigned_to: values.assignedTo,
        account_id: values.accountId || undefined,
        contact_id: values.contactId || undefined,
      });
      setShowCreateForm(false);
    },
    [createTaskAsync],
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your tasks and follow-ups.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm((prev) => !prev)}
          className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {showCreateForm ? 'Cancel' : 'New Task'}
        </button>
      </div>

      {/* Create task form (collapsible) */}
      {showCreateForm ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Create new task</h2>
          <TaskForm onSubmit={handleCreateTask} isLoading={isCreating} />
        </div>
      ) : null}

      {/* Status filter tabs */}
      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Task status filters">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            role="tab"
            aria-selected={statusFilter === filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={clsx(
              'inline-flex min-h-[44px] items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
              statusFilter === filter.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="mt-6">
          <SkeletonLoader variant="card" count={3} />
        </div>
      ) : null}

      {/* Error state */}
      {isError ? (
        <div className="mt-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            Failed to load tasks: {error?.message ?? 'Unknown error'}
          </p>
        </div>
      ) : null}

      {/* Empty state */}
      {!isLoading && !isError && tasks.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No tasks found"
            description={
              statusFilter === 'all'
                ? 'Create your first task to get started.'
                : `No ${statusFilter.replace('_', ' ')} tasks found.`
            }
            action={
              statusFilter === 'all'
                ? {
                    label: 'Create Task',
                    onClick: () => setShowCreateForm(true),
                  }
                : undefined
            }
          />
        </div>
      ) : null}

      {/* Task list */}
      {!isLoading && !isError && tasks.length > 0 ? (
        <ul className="mt-6 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white shadow-sm" role="list">
          {tasks.map((task) => {
            const overdue = isOverdue(task.due_date, task.status);
            return (
              <li
                key={task.id}
                className={clsx(
                  'flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between',
                  overdue && 'bg-red-50',
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={clsx(
                        'text-sm font-medium',
                        overdue ? 'text-red-900' : 'text-gray-900',
                      )}
                    >
                      {task.title}
                    </span>
                    <span
                      className={clsx(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        getPriorityBadgeClasses(task.priority),
                      )}
                    >
                      {task.priority}
                    </span>
                    <span
                      className={clsx(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        getStatusBadgeClasses(task.status),
                      )}
                    >
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                  {task.description ? (
                    <p className="mt-1 text-sm text-gray-600 line-clamp-1">
                      {task.description}
                    </p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
                    <span>Assigned to: {task.assigned_to_name}</span>
                    <span
                      className={clsx(overdue && 'font-semibold text-red-600')}
                    >
                      Due: {formatDueDate(task.due_date)}
                      {overdue ? ' (Overdue)' : ''}
                    </span>
                  </div>
                </div>

                {/* Quick complete action */}
                {task.status !== 'completed' && task.status !== 'cancelled' ? (
                  <button
                    type="button"
                    onClick={() => handleComplete(task.id)}
                    disabled={isCompleting}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-green-300 bg-white px-3 py-2 text-sm font-medium text-green-700 shadow-sm hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Complete task: ${task.title}`}
                  >
                    Complete
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
