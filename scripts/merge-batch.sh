#!/usr/bin/env bash
set -e

BATCH_ID=$1
BASE_BRANCH=${2:-dev}

FEATURE_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ -z "$BATCH_ID" ]; then
  echo "Usage: bash scripts/merge-batch.sh <batch-id> [base-branch]"
  echo "  Merges the current batch branch into the base branch with --no-ff."
  exit 1
fi

if [ "$FEATURE_BRANCH" = "$BASE_BRANCH" ]; then
  echo "Error: Already on $BASE_BRANCH. Switch to the batch branch first."
  exit 1
fi

echo "=== Merging Batch $BATCH_ID ==="
echo "  From: $FEATURE_BRANCH"
echo "  Into: $BASE_BRANCH"
echo ""

echo "Switching to $BASE_BRANCH..."
git checkout "$BASE_BRANCH"
git pull origin "$BASE_BRANCH" 2>/dev/null || echo "  (no remote to pull from, continuing)"

echo ""
echo "Merging with --no-ff..."
git merge --no-ff "$FEATURE_BRANCH" -m "merge: batch-${BATCH_ID} ${FEATURE_BRANCH} into ${BASE_BRANCH}"

echo ""
echo "Running post-merge regression tests..."
npm test
echo ""

echo "Pushing $BASE_BRANCH..."
git push origin "$BASE_BRANCH" 2>/dev/null || echo "  (push skipped — no remote configured)"

echo ""
echo "=== Batch $BATCH_ID merged successfully ==="
echo "  $FEATURE_BRANCH -> $BASE_BRANCH"
echo "  Post-merge tests: PASS"
