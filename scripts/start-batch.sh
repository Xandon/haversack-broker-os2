#!/usr/bin/env bash
set -e

BATCH_ID=$1
BATCH_NAME=$2
BASE_BRANCH=${3:-dev}

if [ -z "$BATCH_ID" ] || [ -z "$BATCH_NAME" ]; then
  echo "Usage: bash scripts/start-batch.sh <batch-id> <batch-name> [base-branch]"
  echo "  Creates a feature branch for a Phase 5 batch."
  echo "  Example: bash scripts/start-batch.sh 8 pipeline-foundation dev"
  exit 1
fi

BRANCH_NAME="feature/batch-${BATCH_ID}-${BATCH_NAME}"

echo "=== Starting Batch $BATCH_ID: $BATCH_NAME ==="
echo ""

echo "Switching to $BASE_BRANCH and pulling latest..."
git checkout "$BASE_BRANCH"
git pull origin "$BASE_BRANCH" 2>/dev/null || echo "  (no remote to pull from, continuing)"

echo ""
echo "Creating branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME"

echo ""
echo "Running baseline tests on $BASE_BRANCH code..."
if npm test 2>/dev/null; then
  BASELINE=$(npm test 2>&1 | grep -oE "Tests[[:space:]]+[0-9]+" | grep -oE "[0-9]+" | tail -1 || echo "unknown")
  echo "  Baseline tests: $BASELINE"
else
  echo "  Warning: baseline tests did not run cleanly"
fi

echo ""
echo "Batch $BATCH_ID ready on branch $BRANCH_NAME"
echo "  Base: $BASE_BRANCH"
echo "  Next: implement tasks, then run scripts/finish-batch.sh"
