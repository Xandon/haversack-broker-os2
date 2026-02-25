#!/bin/bash
set -e
BATCH_ID=$1
BATCH_NAME=$2
BASE_BRANCH=${3:-dev}

[ -z "$BATCH_ID" ] || [ -z "$BATCH_NAME" ] && \
  echo "Usage: start-batch.sh <batch-id> <batch-name> [base-branch]" && exit 1

BRANCH_NAME="feature/batch-${BATCH_ID}-${BATCH_NAME}"

echo "═══════════════════════════════════════════════"
echo "  STARTING BATCH $BATCH_ID: $BATCH_NAME"
echo "  Branch: $BRANCH_NAME"
echo "  Base: $BASE_BRANCH"
echo "═══════════════════════════════════════════════"

# Ensure we're on the latest base
git checkout "$BASE_BRANCH"
git pull origin "$BASE_BRANCH" 2>/dev/null || true

# Create feature branch
git checkout -b "$BRANCH_NAME"

# Create batch test directories
mkdir -p "tests/unit/batch-${BATCH_ID}"
mkdir -p "tests/integration/batch-${BATCH_ID}"
mkdir -p "tests/e2e/screenshots/batch-${BATCH_ID}"

# Initial commit on feature branch
git add .
git commit --allow-empty -m "chore: initialize batch-${BATCH_ID} (${BATCH_NAME})"

echo ""
echo "  ✅ Branch $BRANCH_NAME created and ready"
echo "  Run your implementation, then use finish-batch.sh to verify and merge."
