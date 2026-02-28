# QA Sweep Report — Round 1 (API Only)

**Date:** 2026-02-28
**Branch:** dev
**Scope:** API smoke tests against live backend + seeded PostgreSQL

## Summary

| Metric               | Value              |
| -------------------- | ------------------ |
| API Endpoints Tested | 12                 |
| Tests Passed         | 12                 |
| Tests Failed         | 0                  |
| Auth Tests Passed    | 2/2                |
| RBAC Tests Passed    | 1/1                |
| Bugs Found           | 1 (fixed pre-test) |
| Bugs Fixed           | 1                  |

## API Health Results

| #   | Endpoint                       | Method | Status | Response Time | Notes                         |
| --- | ------------------------------ | ------ | ------ | ------------- | ----------------------------- |
| 1   | /api/health                    | GET    | 200    | <3ms          | OK                            |
| 2   | /api/accounts                  | GET    | 200    | 27ms          | 4 accounts returned           |
| 3   | /api/accounts/:id              | GET    | 200    | <5ms          | Single account with relations |
| 4   | /api/accounts/:id/contacts     | GET    | 200    | <5ms          | Contacts with primary flag    |
| 5   | /api/products                  | GET    | 200    | <5ms          | 3 products with brands        |
| 6   | /api/products/search           | GET    | 200    | <5ms          | Search "coffee" → 1 result    |
| 7   | /api/products/:id              | GET    | 200    | <5ms          | Single product with brand     |
| 8   | /api/brands                    | GET    | 200    | <5ms          | 3 brands with product counts  |
| 9   | /api/users                     | GET    | 200    | <5ms          | 6 users with territories      |
| 10  | /api/accounts (no auth)        | GET    | 401    | <1ms          | Correctly rejected            |
| 11  | /api/users (viewer→admin)      | POST   | 403    | ~1ms          | RBAC correctly blocked        |
| 12  | /api/accounts/check-duplicates | GET    | 200    | <3ms          | Duplicate detection works     |

## Auth & RBAC

- No-token requests correctly return 401
- Viewer role correctly blocked from admin-only routes (403)
- Admin token grants access to all endpoints

## Bug Fixed During Setup

| #   | Severity | Description                                      | Fix                                                     |
| --- | -------- | ------------------------------------------------ | ------------------------------------------------------- |
| 1   | HIGH     | `jsonwebtoken` named ESM imports fail at runtime | Switched to default import with destructure (`884e965`) |

## Database State

| Entity        | Count |
| ------------- | ----- |
| Organizations | 1     |
| Territories   | 3     |
| Users         | 6     |
| Brands        | 3     |
| Products      | 3     |
| Accounts      | 4     |
| Contacts      | 4     |

## Unit Test Coverage

| Workspace | Test Files | Tests  | Status       |
| --------- | ---------- | ------ | ------------ |
| Backend   | 8          | 45     | All pass     |
| Frontend  | 5          | 31     | All pass     |
| **Total** | **13**     | **76** | **All pass** |

## What's Ready

- Backend API fully functional on port 4000
- PostgreSQL 16 + Redis 7 via Docker Compose
- All P0 domain services (Accounts, Contacts, Products, Brands, Users)
- Authentication (JWT sign/verify, 15m access + 7d refresh)
- RBAC enforcement (admin, manager, rep, logistics, viewer)
- Seed data for all domains

## What's Needed for Full QA

- Frontend route pages (login, dashboard, accounts list/detail, products, users)
- Auth login/logout flow (frontend)
- Chrome MCP browser testing for UI verification
