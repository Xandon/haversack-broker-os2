# Feature Specification: Task Management

**Feature Branch**: `017-task-management`
**Created**: 2026-02-28
**Status**: Approved
**PRD Reference**: FR-037

## User Scenarios & Testing

### User Story 1 — View and Filter Tasks (Priority: P1)

As a sales rep, I need to see all my tasks in a sortable, filterable data table so I can prioritize my work and never miss a deadline.

**Why this priority**: Task visibility is the core value — without it, reps can't manage their workload.

**Independent Test**: Navigate to /tasks, verify the data table renders with task data, apply filters, confirm filtered results display correctly.

**Acceptance Scenarios**:

1. **Given** a Rep navigates to /tasks, **When** the page loads, **Then** the system displays the Rep's tasks sorted with overdue tasks at the top (highlighted with a red indicator), followed by tasks sorted by due date ascending, with skeleton loaders during fetch.
2. **Given** the task list is displayed, **When** the Rep selects a status filter (e.g., "Pending"), **Then** only tasks matching that status are shown.
3. **Given** the task list is displayed, **When** the Rep selects a priority filter (e.g., "High"), **Then** only tasks matching that priority are shown.
4. **Given** the task list is displayed, **When** the Rep toggles the "Overdue" filter, **Then** only overdue tasks are shown.
5. **Given** the task list is loading, **When** the API call is in progress, **Then** skeleton loaders are displayed.
6. **Given** the task list returns no results, **When** the page renders, **Then** an empty state message is displayed with guidance.
7. **Given** the API returns an error, **When** the page renders, **Then** an error state is displayed with a retry button.

---

### User Story 2 — Create and Edit Tasks (Priority: P1)

As a sales rep, I need to create new tasks and edit existing ones via a dialog form so I can track action items for my accounts.

**Why this priority**: Task creation is the second core capability — without it, the task list would always be empty.

**Independent Test**: Click "New Task", fill in the form, submit, verify the task appears in the list. Click an existing task, edit it, save, verify the changes persist.

**Acceptance Scenarios**:

1. **Given** a Rep clicks "New Task," **When** the task dialog opens, **Then** it displays fields for title, description, due date (datetime-local input), priority (dropdown), and optional account association, with Zod validation on save.
2. **Given** a Rep fills in valid task data and clicks "Save," **When** the mutation succeeds, **Then** the dialog closes, the task list refreshes, and the new task appears.
3. **Given** a Rep submits the form with invalid data (e.g., empty title), **When** validation runs, **Then** inline error messages are displayed next to the invalid fields.
4. **Given** a Rep clicks on an existing task row, **When** the edit dialog opens, **Then** it is pre-populated with the task's current data.
5. **Given** a Rep edits a task and clicks "Save," **When** the mutation succeeds, **Then** the dialog closes and the updated task appears in the list.
6. **Given** the create/update mutation fails, **When** the error is returned, **Then** an error message is displayed in the dialog and the form remains open.

---

### User Story 3 — Quick Status Toggle (Priority: P2)

As a sales rep, I need to quickly mark tasks as complete directly from the list without opening a dialog so I can update task status efficiently.

**Why this priority**: Convenience feature that reduces friction — not blocking, but high-value for daily use.

**Independent Test**: Click the status toggle checkbox on a task row, verify the task status updates to "completed" and the UI reflects the change.

**Acceptance Scenarios**:

1. **Given** a task with status "pending" or "in_progress" is displayed, **When** the Rep clicks the status toggle checkbox, **Then** the task status is updated to "completed" via PUT /api/tasks/:id and the row updates optimistically.
2. **Given** a task with status "completed" is displayed, **When** the Rep clicks the status toggle, **Then** the task status is reverted to "pending."
3. **Given** the status update mutation fails, **When** the error occurs, **Then** the optimistic update is rolled back and an error toast is shown.

---

### Edge Cases

- What happens when the task list is empty? Display an empty state with "No tasks found" and a prompt to create one.
- What happens when filters produce no results? Display "No tasks match your filters" with a clear filters option.
- What happens when a task's due date is in the past? The row shows a red overdue indicator and the task sorts to the top.
- What happens when the API is slow? Skeleton loaders display until data arrives.
- What happens when creating a task fails? The form stays open with an error message; no data is lost.

## Requirements

### Functional Requirements

- **FR-037**: The system shall display a Task Management page at /tasks with a data table supporting filters for status, priority, and overdue state, with task creation and editing via dialog forms, and a quick status toggle for marking tasks complete.

### Key Entities

- **Task**: A trackable action item with title, description, due date, priority (high/medium/low), status (pending/in_progress/completed/cancelled), assignee, and optional account/contact association. Computed property: isOverdue (server-side).

## Success Criteria

### Measurable Outcomes

- **SC-001**: Rep can view, filter, and sort their task list in under 2 seconds (p95 load time).
- **SC-002**: Rep can create a new task in under 30 seconds via the dialog form.
- **SC-003**: Rep can mark a task as complete with a single click (status toggle).
- **SC-004**: Overdue tasks are visually highlighted and sorted to the top of the list.

## Clarifications

1. **Assignee field**: The PRD mentions "searchable user dropdown" for assignee. Since the current user list is small (9 reps), we use a simple `<Select>` dropdown populated with users, not a full searchable combobox. Decision: Use native Select. Rationale: Small user count doesn't justify combobox complexity.

2. **Account/contact association**: Tasks optionally link to an account. We include an account selector dropdown (same pattern as activities page). Contact association is deferred — the backend supports it but the frontend will omit it for simplicity. Decision: Account dropdown only, no contact picker. Rationale: Contact picker adds complexity with low initial value.

3. **Task deletion**: The PRD doesn't mention a delete button. We will not include delete in the initial UI — tasks can be cancelled via status change. Decision: No delete button. Rationale: Cancellation serves the same purpose with an audit trail.

4. **Manager view**: Managers see all tasks (backend handles scope). The UI doesn't need role-specific filtering — the API returns the right set. Decision: No role-specific UI. Rationale: Backend handles scoping via RBAC.

5. **Sort controls**: The PRD says "sorted to top" for overdue. We use the API's sortBy/sortOrder params with overdue filter toggle, not client-side sorting. Decision: Server-side sort only. Rationale: Consistent with cursor pagination pattern.
