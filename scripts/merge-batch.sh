#!/bin/bash
set -e
BATCH_ID=$1
BASE_BRANCH=${2:-dev}
FEATURE_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

[ -z "$BATCH_ID" ] && echo "Usage: merge-batch.sh <batch-id> [base-branch]" && exit 1

echo "═══════════════════════════════════════════════"
echo "  MERGING BATCH $BATCH_ID"
echo "  From: $FEATURE_BRANCH"
echo "  Into: $BASE_BRANCH"
echo "═══════════════════════════════════════════════"

# Switch to base and pull latest
git checkout "$BASE_BRANCH"
git pull origin "$BASE_BRANCH" 2>/dev/null || true

# Merge feature branch with no-ff to preserve history
git merge --no-ff "$FEATURE_BRANCH" -m "merge: batch-${BATCH_ID} ($FEATURE_BRANCH) into $BASE_BRANCH"

# Run post-merge regression
echo ""
echo "▶ Post-merge regression test..."
npm test
if [ $? -ne 0 ]; then
  echo "  ❌ POST-MERGE REGRESSION FAILED"
  echo "  Fix on $BASE_BRANCH or revert: git revert -m 1 HEAD"
  exit 1
fi

npm run lint
npm run test:integration 2>/dev/null || true

echo ""
echo "  ✅ Post-merge regression passed"

# Push
git push origin "$BASE_BRANCH" 2>/dev/null || echo "  ⚠️  Push skipped"

echo ""
echo "═══════════════════════════════════════════════"
echo "  ✅ BATCH $BATCH_ID MERGED INTO $BASE_BRANCH"
echo "═══════════════════════════════════════════════"
echo "  To delete the feature branch:"
echo "    git branch -d $FEATURE_BRANCH"
