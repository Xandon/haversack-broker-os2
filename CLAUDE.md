# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Haversack Unified Platform — a CRM-first web application for Haversack Sales, a specialty food broker/wholesaler in the Pacific Northwest. Replaces an aging FileMaker system. 9 territory sales reps, ~50 artisan food brands, dual revenue model (broker at 8-15% commission + wholesale at 25-40% markup).

## Tech Stack

- **Frontend:** React 18+ / Next.js 14+ (App Router only) / Tailwind CSS + shadcn/ui / TanStack Query + React Context / React Hook Form + Zod
- **Backend:** Node.js 18+ / Fastify 4+ (not Express)
- **Database:** PostgreSQL 16+ with Prisma ORM, RLS for tenant isolation, JSONB for flexible fields
- **Cache/Queue:** Redis 7+ / Bull for background jobs
- **Email:** Microsoft Graph API (service account, on-behalf-of) + Nodemailer fallback
- **AI:** Anthropic Claude API (primary), OpenAI (fallback), provider abstraction layer
- **Hosting:** Docker Compose — separate containers for frontend, backend, worker, database
- **CI/CD:** GitHub Actions
- **Monitoring:** Sentry (errors) + PostHog (analytics)

## Architecture

Dockerized monorepo. All code lives in one repository with separate Docker containers per service. No raw SQL — all DB access through Prisma (`$queryRaw` with parameterized inputs only exception). No Pages Router — App Router exclusively. No Redux/Zustand — TanStack Query for server state, React Context for UI state.

## Key Commands

```bash
# PRD validation (30 tests across 7 categories)
node scripts/validate-prd.js

# Pre-commit hook runs PRD validation automatically when docs/prd.md is modified
```

## Project Structure

```
docs/prd.md                  # Production PRD (30 FRs, 14 NFRs, 12 USs) — validated by scripts/validate-prd.js
docs/sections/               # Supplementary detailed user stories and UI/UX specs
docs/prd-archive/            # Archived PRD versions (named prd-YYYY-MM-DD.md)
research/                    # Source research materials (comprehensive PRD docx)
scripts/validate-prd.js      # PRD validation framework — exit 0 = pass, exit 1 = fail
```

## PRD Conventions

Requirements use strict formatting parsed by the validator:
- `FR-XXX:` — functional requirements, sequential numbering
- `NFR-XXX:` — non-functional requirements, sequential numbering
- `AC-XXXx:` — acceptance criteria, must contain Given/When/Then
- `US-XXX:` — user stories, must reference FRs and include Error/Edge Cases subsections
- No subjective words (intuitive, fast, easy, simple, seamless, robust, scalable, flexible, modern, clean, nice, good, efficient) without a measurable qualifier within 20 words
- Every FR must be referenced by at least one US; every US must reference at least one FR
- AC/FR ratio must be >= 1.5

## Domain Concepts

- **Broker model:** Haversack represents a brand to retailers, earns 8-15% commission, does not hold inventory
- **Wholesale model:** Haversack buys, warehouses, and resells at 25-40% markup
- **Line Card:** Authorization matrix — which reps can sell which brands, with date ranges and restrictions
- **Layout of Truth:** Master definition of all data field names, types, and validation rules (the data quality standard)
- **Multi-vendor split:** Orders automatically separate into broker vs. wholesale fulfillment streams per line item
- **FSMA 204:** FDA food traceability regulation — Key Data Elements (KDEs) required at Critical Tracking Events (CTEs)
- **Health score:** 0-100 account engagement metric, recalculated nightly

## Key Design Decisions

- Mobile-first, 320px breakpoint first. Touch targets minimum 44px. Key actions reachable in 2 taps.
- Skeleton loaders, not spinners. Optimistic UI updates. Search-as-you-type with 300ms debounce.
- AI is augmentative only — all AI output labeled "AI-Generated" and editable, never autonomous.
- RBAC: 5 roles (admin, manager, rep, logistics, viewer) with territory-scoped data access via PostgreSQL RLS.
- Orders >= $5,000 require manager approval before confirmation.
- Commission rules configurable per brand/territory/volume tier with full audit trail.

## Performance Targets

- API p95: <200ms | FCP: <2s on 4G | Search: <200ms | DB query p95: <50ms | AI responses: <3s | Uptime: 99.5%
