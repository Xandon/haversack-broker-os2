# API Contracts: AI Features

See plan.md API Contracts section for full endpoint specifications.

Base path: `/api/ai/`

| Method | Path | Purpose | Auth | Rate Limit |
|--------|------|---------|------|------------|
| POST | `/api/ai/meeting-brief` | Generate meeting prep brief | rep, manager, admin | 10/min |
| POST | `/api/ai/email-draft` | Generate email draft | rep, manager, admin | 15/min |
| POST | `/api/ai/activity-summary` | Generate activity summary | rep, manager, admin | 10/min |
