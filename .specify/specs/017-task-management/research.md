# Research — Task Management

## Reference Domain: Activities (closest pattern)

### Route Structure
- `backend/src/domains/tasks/task.routes.ts` — CRUD endpoints with Zod validation, auth middleware, tenant isolation
- Pattern: `app.get('/api/tasks', { preHandler: [authenticate, authorize(['rep', 'manager'])] }, handler)`

### Service Pattern
- `task.service.ts` — Functions accept `(prisma, tenantId, ...)`, return typed responses
- Cursor-based pagination with `{ data, pagination: { cursor, hasMore, total } }`
- `TaskWithOverdue` type extends base Task with computed `isOverdue` boolean

### Frontend Hook Pattern (from use-activities.ts)

**Decision**: Follow the `useActivities` pattern for `useTasks`.

**Rationale**: Activities and tasks share the same data shape (list with filters, cursor pagination, create mutation with query invalidation).

**Pattern**:
```
Query: useQuery({ queryKey: ['tasks', ...filterParams], queryFn: apiClient<TaskListResponse>('/api/tasks?...') })
Mutation: useMutation({ mutationFn: apiClient('/api/tasks', { method: 'POST', body }), onSuccess: invalidate(['tasks']) })
```

### UI Component Pattern (from activities page)

**Decision**: Follow the activities page layout — filter bar at top, DataTable below, dialog for create/edit.

**Rationale**: Consistent UX across task management features. Activities page already proved the pattern.

**Alternatives considered**:
- Kanban board: Rejected — tasks don't have stages like opportunities. A list is more appropriate.
- Card grid: Rejected — too much wasted space for simple task data. DataTable is denser and more functional.

### Column Pattern (from activity-columns.tsx)

**Decision**: Define columns with `ColumnDef<TaskItem>[]` array, use StatusBadge for priority/status display.

**Alternatives**:
- Inline status text: Rejected — badges provide better visual scanning.

### Filter Pattern (from activity-filters.tsx)

**Decision**: Use native `<Select>` dropdowns for status, priority, and overdue filters in a horizontal bar above the table.

**Rationale**: Matches existing filter bar patterns. Simple, accessible, consistent.
