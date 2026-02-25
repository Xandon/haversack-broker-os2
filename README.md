# Haversack Unified Platform

CRM-first web application for Haversack Sales, a specialty food broker/wholesaler in the Pacific Northwest. Replaces an aging FileMaker system for 9 territory sales reps managing ~50 artisan food brands with a dual revenue model (brokerage at 8-15% commission and wholesale at 25-40% markup).

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), React 18+, Tailwind CSS, shadcn/ui, TanStack Query
- **Backend:** Fastify 4+ on Node.js 20 LTS, Prisma 5+, PostgreSQL 16+
- **Worker:** Bull (Redis 7+ backed) for background jobs
- **Testing:** Vitest, Supertest, Playwright
- **Infrastructure:** Docker Compose, Turborepo, GitHub Actions

## Setup

### Prerequisites

- Node.js 20 LTS
- Docker and Docker Compose
- Git

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd haversack-broker-os

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start services (PostgreSQL, Redis)
docker compose -f docker/docker-compose.dev.yml up -d

# Run database migrations
npx prisma migrate dev

# Seed development data
npx prisma db seed
```

## Development

```bash
# Start all services in development mode
npm run dev

# Run linter
npm run lint

# Fix lint issues
npm run lint:fix

# Format code
npm run format
```

## Testing

```bash
# Run all unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e
```

## Project Structure

```
haversack-broker-os/
├── backend/          # Fastify API server
├── frontend/         # Next.js App Router frontend
├── worker/           # Bull job processor
├── packages/shared/  # Shared schemas, types, constants
├── prisma/           # Database schema and migrations
├── docker/           # Docker Compose configurations
├── e2e/              # End-to-end test suites
├── scripts/          # Automation and validation scripts
├── docs/             # Product requirements and documentation
└── .specify/         # Spec-kit artifacts (constitution, specs, plans)
```

## Scripts

```bash
# Validate PRD
node scripts/validate-prd.js

# Validate spec-kit artifacts
node scripts/validate-speckit.js --all

# Validate scaffolding
bash scripts/validate-scaffolding.sh --all

# Feature branch workflow
bash scripts/new-feature.sh <feature-name>
bash scripts/push-feature.sh
bash scripts/merge-feature.sh
```
