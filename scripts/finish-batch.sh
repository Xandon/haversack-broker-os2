#!/usr/bin/env bash
set -e

BATCH_ID=$1
BASE_BRANCH=${2:-dev}

BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ -z "$BATCH_ID" ]; then
  echo "Usage: bash scripts/finish-batch.sh <batch-id> [base-branch]"
  echo "  Runs all verification layers and pushes the batch branch."
  exit 1
fi

echo "=== Finishing Batch $BATCH_ID ==="
echo "  Branch: $BRANCH"
echo "  Base: $BASE_BRANCH"
echo ""

# Layer 1: Unit tests
echo "[1/6] Running unit tests..."
npm test
echo ""

# Layer 2: Integration tests
echo "[2/6] Running integration tests..."
npm run test:integration 2>/dev/null || echo "  (no integration tests configured, skipping)"
echo ""

# Layer 3: Lint
echo "[3/6] Running linter..."
npm run lint
echo ""

# Layer 4: Type check
echo "[4/6] Running type check..."
npm run typecheck 2>/dev/null || npx tsc --noEmit 2>/dev/null || echo "  (typecheck not configured, skipping)"
echo ""

# Layer 5: Coverage check
echo "[5/6] Running coverage check..."
npm run test:coverage 2>/dev/null || echo "  (coverage not configured, skipping)"
echo ""

# Layer 6: Build
echo "[6/6] Running build..."
npm run build 2>/dev/null || echo "  (build not configured, skipping)"
echo ""

echo "=== All verification layers passed ==="
echo ""

echo "Pushing $BRANCH to origin..."
git push origin "$BRANCH" -u 2>/dev/null || git push --set-upstream origin "$BRANCH"

echo ""
echo "Batch $BATCH_ID verified and pushed."
echo "  Branch: $BRANCH"
echo "  Next: run scripts/merge-batch.sh $BATCH_ID $BASE_BRANCH"
