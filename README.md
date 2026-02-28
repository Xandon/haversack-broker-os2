# Haversack Unified Platform

CRM-first web application for Haversack Sales — specialty food broker/wholesaler in the Pacific Northwest.

## Setup

1. Clone the repo
2. Copy `.env.example` to `.env` and fill in values
3. `npm install` (installs all workspace dependencies)
4. `docker compose -f docker/docker-compose.dev.yml up -d` (starts PostgreSQL + Redis)
5. `npx prisma migrate dev` (runs database migrations)
6. `npm run dev` (starts frontend + backend + worker)

## Test

- `npm test` — runs all unit/integration tests
- `npm run test:coverage` — runs tests with coverage
- `npm run test:e2e` — runs Playwright E2E tests
- `npm run lint` — runs ESLint

## Project Structure

Turborepo monorepo with workspaces: backend/ (Fastify), frontend/ (Next.js), worker/ (Bull), packages/shared/ (shared types/schemas).
