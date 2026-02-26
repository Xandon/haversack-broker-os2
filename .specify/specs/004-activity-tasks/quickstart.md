# Quickstart: Activity & Task Management

## Key Validation Scenarios

### 1. Quick Activity Logging (AC-007a)
```
Login as Rep → POST /api/activities with type "visit", accountId, occurredAt
→ Verify: 201 response in <2s, activity appears in GET /api/accounts/:id/timeline
```

### 2. Demo Activity with Product (AC-007b)
```
POST /api/activities with type "demo", demos: [{ productId, quantitySampled: 5 }]
→ Verify: 201, demos array populated in response
POST /api/activities with type "demo", demos: [] (empty)
→ Verify: 400 error "Demo activities require at least one product"
```

### 3. Activity Edit Window
```
Create activity → PUT /api/activities/:id (within 15min) → 200 (success)
Wait 15min → PUT /api/activities/:id as Rep → 403 (edit window expired)
PUT /api/activities/:id as Manager → 200 (managers bypass edit window)
```

### 4. Activity Timeline Pagination (AC-008a)
```
Create 50 activities for an account
GET /api/accounts/:id/timeline?limit=20
→ Verify: 20 items, hasMore: true, cursor present
GET /api/accounts/:id/timeline?limit=20&cursor=<cursor>
→ Verify: next 20 items, response <500ms
```

### 5. Timeline Filtering (AC-008b)
```
GET /api/accounts/:id/timeline?activityType=visit
→ Verify: only visit activities returned, counts updated
GET /api/accounts/:id/timeline?startDate=2026-01-01&endDate=2026-01-31
→ Verify: only activities in date range returned
```

### 6. Task Creation with Reminders (AC-009a)
```
POST /api/tasks with dueDate "2026-03-15T10:00:00Z"
→ Verify: 201, task created
→ Verify: 2 TaskReminder records created (24h + 1h before)
→ Verify: BullMQ jobs queued with correct delays
```

### 7. Task List with Overdue Sorting (AC-009b)
```
Create tasks: overdue (yesterday), upcoming (tomorrow), completed (yesterday)
GET /api/tasks?assigneeId=<me>
→ Verify: overdue task first (isOverdue: true), then upcoming, completed excluded by default
```

### 8. Task Completion
```
PUT /api/tasks/:id with status "completed"
→ Verify: completedAt set, pending reminders cancelled
→ Verify: audit trail record written
```

### 9. Email Auto-Linking (AC-010a)
```
Create contact with email "buyer@pacificbistro.com" on account X
POST /api/email-records with recipientEmail "buyer@pacificbistro.com"
→ Verify: email record created with contactId and accountId auto-populated
```

### 10. Unmatched Emails (AC-010b)
```
POST /api/email-records with recipientEmail "unknown@nowhere.com"
→ Verify: email created with contactId: null
GET /api/email-records/unmatched
→ Verify: email appears in unmatched list
```

### 11. Email Engagement Tracking
```
PUT /api/email-records/:id/engagement with event "opened"
→ Verify: openedAt set, status updated to "opened"
```

### 12. Activity Metrics
```
Create various activities across 2 reps
GET /api/activities/metrics?startDate=...&endDate=...&groupBy=rep (as Manager)
→ Verify: per-rep counts by type returned
```

### 13. Tenant Isolation
```
Create activity as Rep in tenant A
Switch to Rep in tenant B
GET /api/accounts/:id/timeline → 404 (account not found in tenant B)
```

### 14. Reminder Processing
```
Create task with dueDate 1 hour from now
→ Verify: only 1h reminder scheduled (24h already past)
Process reminder job → Verify: Notification record created for assignee
Complete task → Fire reminder → Verify: reminder skipped (task completed)
```
