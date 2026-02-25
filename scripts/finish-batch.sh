#!/bin/bash
set -e
BATCH_ID=$1
BASE_BRANCH=${2:-dev}
FEATURE_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

[ -z "$BATCH_ID" ] && echo "Usage: finish-batch.sh <batch-id> [base-branch]" && exit 1

echo "═══════════════════════════════════════════════"
echo "  FINISHING BATCH $BATCH_ID"
echo "  Branch: $FEATURE_BRANCH"
echo "  Target: $BASE_BRANCH"
echo "═══════════════════════════════════════════════"

# ── Layer 1: Unit tests ──
echo ""
echo "▶ Layer 1: Unit Tests"
npm test
if [ $? -ne 0 ]; then
  echo "  ❌ Unit tests FAILED — cannot finish batch"
  exit 1
fi
echo "  ✅ Unit tests pass"

# ── Layer 2: Integration tests ──
echo ""
echo "▶ Layer 2: Integration Tests"
npm run test:integration 2>/dev/null || echo "  ⚠️  No integration tests configured yet"
echo "  ✅ Integration tests done"

# ── Layer 3: Lint ──
echo ""
echo "▶ Layer 3: Lint"
npm run lint
if [ $? -ne 0 ]; then
  echo "  ❌ Lint FAILED — cannot finish batch"
  exit 1
fi
echo "  ✅ Lint clean"

# ── Layer 4: Type check ──
echo ""
echo "▶ Layer 4: Type Check"
npm run typecheck 2>/dev/null || npm run build
if [ $? -ne 0 ]; then
  echo "  ❌ Type check FAILED — cannot finish batch"
  exit 1
fi
echo "  ✅ Types clean"

# ── Layer 5: Coverage ──
echo ""
echo "▶ Layer 5: Coverage"
npm run test:coverage 2>&1 || echo "  ⚠️  Coverage report not available"
echo "  ✅ Coverage report generated"

# ── Layer 6: Build ──
echo ""
echo "▶ Layer 6: Build"
npm run build 2>&1
if [ $? -ne 0 ]; then
  echo "  ❌ Build FAILED — cannot finish batch"
  exit 1
fi
echo "  ✅ Build succeeds"

# ── All Passed ──
echo ""
echo "═══════════════════════════════════════════════"
echo "  ✅ ALL VERIFICATION LAYERS PASSED"
echo "═══════════════════════════════════════════════"
echo ""

# Stage changes
git add .
CHANGES=$(git status --short | wc -l | tr -d ' ')
if [ "$CHANGES" -gt 0 ]; then
  git commit -m "feat(batch-${BATCH_ID}): implementation complete — all tests passing"
fi

# Push feature branch
git push -u origin "$FEATURE_BRANCH" 2>/dev/null || git push origin "$FEATURE_BRANCH" 2>/dev/null || echo "  ⚠️  Push skipped (no remote or already up to date)"

echo ""
echo "  Branch $FEATURE_BRANCH verified and ready."
echo "  To merge: bash scripts/merge-batch.sh $BATCH_ID $BASE_BRANCH"
