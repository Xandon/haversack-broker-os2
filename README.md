# Haversack Unified Platform

CRM-first web application for Haversack Sales — a specialty food broker/wholesaler in the Pacific Northwest. Replaces an aging FileMaker system with unified account management, mobile-first order entry, automated commission tracking, and AI-augmented productivity tools.

## Prerequisites

- Node.js 20 LTS
- Docker & Docker Compose (for PostgreSQL 16+ and Redis 7+)

## Setup

```bash
# Install dependencies
npm install

# Start infrastructure (PostgreSQL + Redis)
npm run docker:up

# Run database migrations
npm run db:migrate

# Seed development data
npm run db:seed

# Start all services in development mode
npm run dev
```

## Testing

```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e
```

## Development Workflow

```bash
# Create a new feature branch
bash scripts/new-feature.sh <feature-name>

# Push with lint + test gates
bash scripts/push-feature.sh

# Merge back to main
bash scripts/merge-feature.sh
```

## Project Structure

- `backend/` — Fastify API server
- `frontend/` — Next.js App Router frontend
- `worker/` — BullMQ background job processor
- `packages/shared/` — Shared Zod schemas, types, constants
- `prisma/` — Database schema and migrations
- `docker/` — Docker Compose configurations
- `e2e/` — End-to-end test suites
- `scripts/` — Automation and validation scripts

## Tech Stack

TypeScript 5.4+ | Node.js 20 LTS | Next.js 14+ (App Router) | Fastify 4+ | Prisma 5+ | PostgreSQL 16+ | Redis 7+ | BullMQ | Vitest | Playwright
