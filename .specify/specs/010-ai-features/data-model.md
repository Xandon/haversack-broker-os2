# Data Model: AI Features

## Schema Changes

**None.** This feature operates in read-only mode against existing Prisma models. No migrations required.

## Existing Models Used (Read-Only)

| Model | Fields Used | Purpose |
|-------|-------------|---------|
| Account | id, name, tenantId, deletedAt | Account validation + context |
| Contact | id, name, title, email, isPrimary, accountId | Meeting brief contacts + email draft recipient |
| Activity | id, type, subject, notes, createdAt, accountId | Meeting brief + activity summary |
| Order | id, status, total, createdAt, accountId | Meeting brief order trends |
| OrderLineItem | id, productId, quantity, unitPrice | Order trend detail |
| Product | id, name, sku, certifications, unitPrice | Email draft product context |
| Brand | id, name | Product brand name |
| AccountHealthScore | overallScore, calculatedAt | Meeting brief health data |

## Audit Logging

AI requests logged via existing `writeAuditLog` with:
- `entityType`: `'ai_request'`
- `action`: `'ai_meeting_brief'` | `'ai_email_draft'` | `'ai_activity_summary'`
- `newValue`: JSON containing provider, response time, token count, success/failure
