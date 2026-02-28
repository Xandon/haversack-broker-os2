# Quickstart — Task Management Validation Scenarios

## Scenario 1: View Task List (AC-037a)

1. Login as a sales rep
2. Navigate to /tasks
3. Verify: page title "Tasks" is visible
4. Verify: data table renders with task rows
5. Verify: overdue tasks have a red indicator
6. Verify: tasks are sorted by due date ascending

## Scenario 2: Filter Tasks

1. From the /tasks page
2. Select "High" from the priority filter
3. Verify: only high-priority tasks are shown
4. Select "Pending" from the status filter
5. Verify: only pending + high-priority tasks are shown
6. Toggle "Overdue" filter on
7. Verify: only overdue + pending + high-priority tasks are shown

## Scenario 3: Create a Task (AC-037b)

1. Click "New Task" button
2. Verify: dialog opens with empty form
3. Fill in: title="Follow up with client", dueDate=tomorrow, priority=high
4. Click "Save"
5. Verify: dialog closes
6. Verify: new task appears in the list

## Scenario 4: Edit a Task

1. Click on an existing task row
2. Verify: dialog opens pre-populated with task data
3. Change the priority from "high" to "medium"
4. Click "Save"
5. Verify: dialog closes
6. Verify: task row shows updated priority

## Scenario 5: Quick Complete Toggle

1. Find a task with status "pending" in the list
2. Click the status toggle checkbox
3. Verify: task status changes to "completed"
4. Click the toggle again
5. Verify: task status reverts to "pending"

## Scenario 6: Empty State

1. Apply filters that match no tasks
2. Verify: "No tasks match your filters" message is displayed
