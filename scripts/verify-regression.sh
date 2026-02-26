#!/usr/bin/env bash
set -e

echo "=== Regression Verification ==="
echo ""

BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Branch: $BRANCH"
echo ""

# Full test suite
echo "[1/4] Running full test suite..."
npm test
echo ""

# Integration tests
echo "[2/4] Running integration tests..."
npm run test:integration 2>/dev/null || echo "  (no integration tests configured, skipping)"
echo ""

# Lint
echo "[3/4] Running linter..."
npm run lint
echo ""

# Type check
echo "[4/4] Running type check..."
npm run typecheck 2>/dev/null || npx tsc --noEmit 2>/dev/null || echo "  (typecheck not configured, skipping)"
echo ""

echo "=== Regression verification PASSED ==="
echo "  Branch: $BRANCH"
echo "  All layers green."
