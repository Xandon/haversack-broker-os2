'use client';

import * as React from 'react';
import { PageHeader } from '@/components/patterns/page-header';
import { DataTable } from '@/components/patterns/data-table';
import { ErrorState } from '@/components/patterns/error-state';
import { EmptyState } from '@/components/patterns/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { getTaskColumns } from '@/components/tasks/task-columns';
import { TaskFilterBar, type TaskFilters } from '@/components/tasks/task-filter-bar';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';
import { useTasks, useUpdateTask, type TaskItem } from '@/hooks/use-tasks';

function TaskListSkeleton(): React.ReactElement {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export default function TasksPage(): React.ReactElement {
  const [filters, setFilters] = React.useState<TaskFilters>({});
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<TaskItem | undefined>(undefined);

  const {
    data: tasksData,
    isLoading,
    isError,
    refetch,
  } = useTasks({
    status: filters.status,
    priority: filters.priority,
    overdue: filters.overdue,
  });

  const updateTask = useUpdateTask();

  const handleStatusToggle = React.useCallback(
    (taskId: string, currentStatus: string) => {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      updateTask.mutate({ id: taskId, data: { status: newStatus } });
    },
    [updateTask],
  );

  const columns = React.useMemo(
    () => getTaskColumns({ onStatusToggle: handleStatusToggle }),
    [handleStatusToggle],
  );

  const handleRowClick = React.useCallback((row: TaskItem) => {
    setEditingTask(row);
    setFormOpen(true);
  }, []);

  const handleNewTask = React.useCallback(() => {
    setEditingTask(undefined);
    setFormOpen(true);
  }, []);

  const getRowClassName = React.useCallback((row: TaskItem): string => {
    return row.isOverdue ? 'border-l-4 border-l-destructive bg-destructive/5' : '';
  }, []);

  const total = tasksData?.pagination.total ?? 0;

  if (isError) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Tasks" />
        <ErrorState
          title="Failed to load tasks"
          message="There was an error loading tasks. Please try again."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Tasks" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TaskFilterBar filters={filters} onFilterChange={setFilters} />
        <Button onClick={handleNewTask}>New Task</Button>
      </div>

      {isLoading ? (
        <TaskListSkeleton />
      ) : tasksData && tasksData.data.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description={
            filters.status || filters.priority || filters.overdue
              ? 'No tasks match your filters. Try adjusting your filters.'
              : 'No tasks yet. Create your first task to get started.'
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {tasksData?.data.length ?? 0} of {total} tasks
          </p>
          <DataTable
            columns={columns}
            data={tasksData?.data ?? []}
            pageSize={20}
            onRowClick={handleRowClick}
            getRowClassName={getRowClassName}
          />
        </>
      )}

      <TaskFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingTask(undefined);
        }}
        accounts={[]}
        users={[]}
        task={
          editingTask
            ? {
                id: editingTask.id,
                title: editingTask.title,
                description: editingTask.description,
                dueDate: editingTask.dueDate,
                priority: editingTask.priority,
                status: editingTask.status,
                assigneeId: editingTask.assigneeId,
                accountId: editingTask.accountId,
              }
            : undefined
        }
      />
    </div>
  );
}
