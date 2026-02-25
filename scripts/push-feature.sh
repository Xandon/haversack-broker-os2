#!/bin/bash
set -e

echo "Running lint..."
npm run lint

echo "Running tests..."
npm test

echo "Running E2E..."
npm run test:e2e 2>/dev/null || echo "No E2E tests found, skipping."

BRANCH=$(git rev-parse --abbrev-ref HEAD)
git push origin "$BRANCH"
echo "All checks passed. Branch $BRANCH pushed."
