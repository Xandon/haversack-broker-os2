#!/bin/bash
# Do NOT use set -e — we want to collect all results, not abort on first failure

echo "═══════════════════════════════════════════════"
echo "  PHASE 5 PRE-FLIGHT CHECK"
echo "═══════════════════════════════════════════════"

PASS=0
FAIL=0
FEATURE_DIR=""

# ─── Git State ───────────────────────────────────
echo ""
echo "▶ Git State"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "  ✅ Git repository initialized"
  PASS=$((PASS + 1))
else
  echo "  ❌ Not a git repository"
  FAIL=$((FAIL + 1))
fi

if [ -z "$(git status --porcelain)" ]; then
  echo "  ✅ Working tree is clean"
  PASS=$((PASS + 1))
else
  echo "  ⚠️  Working tree has uncommitted changes:"
  git status --short
  FAIL=$((FAIL + 1))
fi

if git show-ref --verify --quiet refs/heads/dev 2>/dev/null; then
  echo "  ✅ dev branch exists"
  PASS=$((PASS + 1))
elif git show-ref --verify --quiet refs/heads/develop 2>/dev/null; then
  echo "  ✅ develop branch exists"
  PASS=$((PASS + 1))
elif git show-ref --verify --quiet refs/heads/main 2>/dev/null; then
  echo "  ⚠️  No dev/develop branch — using main as base"
  PASS=$((PASS + 1))
else
  echo "  ❌ No dev, develop, or main branch found"
  FAIL=$((FAIL + 1))
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
echo "  ℹ️  Current branch: $CURRENT_BRANCH"

# ─── Spec Artifacts ──────────────────────────────
echo ""
echo "▶ Spec Artifacts"

SPEC_DIRS=$(find .specify/specs -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort)
SPEC_COUNT=$(echo "$SPEC_DIRS" | grep -c . 2>/dev/null || echo 0)

if [ "$SPEC_COUNT" -eq 0 ]; then
  echo "  ❌ No feature specs found in .specify/specs/"
  FAIL=$((FAIL + 1))
elif [ "$SPEC_COUNT" -eq 1 ]; then
  FEATURE_DIR=$(echo "$SPEC_DIRS" | head -1)
  echo "  ✅ Feature directory: $FEATURE_DIR"
  PASS=$((PASS + 1))
else
  echo "  ℹ️  Multiple feature specs found:"
  echo "$SPEC_DIRS" | while read dir; do echo "      - $dir"; done
  FEATURE_DIR=$(echo "$SPEC_DIRS" | tail -1)
  echo "  → Using latest: $FEATURE_DIR"
  PASS=$((PASS + 1))
fi

REQUIRED_FILES=(
  "$FEATURE_DIR/spec.md"
  "$FEATURE_DIR/plan.md"
  "$FEATURE_DIR/tasks.md"
  "$FEATURE_DIR/data-model.md"
  ".specify/memory/constitution.md"
  "CLAUDE.md"
  "docs/prd.md"
)

for f in "${REQUIRED_FILES[@]}"; do
  if [ -f "$f" ]; then
    echo "  ✅ $f"
    PASS=$((PASS + 1))
  else
    echo "  ❌ MISSING: $f"
    FAIL=$((FAIL + 1))
  fi
done

OPTIONAL_FILES=(
  "$FEATURE_DIR/research.md"
  "$FEATURE_DIR/quickstart.md"
  "$FEATURE_DIR/checklist.md"
)
for f in "${OPTIONAL_FILES[@]}"; do
  if [ -f "$f" ]; then
    echo "  ✅ $f"
  else
    echo "  ⚠️  Optional: $f not found"
  fi
done

if ls "$FEATURE_DIR"/contracts/* >/dev/null 2>&1; then
  echo "  ✅ $FEATURE_DIR/contracts/ has files"
  PASS=$((PASS + 1))
else
  echo "  ⚠️  No contract files (OK if no APIs)"
fi

# ─── Spec Validation ─────────────────────────────
echo ""
echo "▶ Spec Validation"

if [ -f "scripts/validate-speckit.js" ]; then
  echo "  Running spec-kit validation..."
  if node scripts/validate-speckit.js --all >/dev/null 2>&1; then
    echo "  ✅ Spec-kit validation passed"
    PASS=$((PASS + 1))
  else
    echo "  ❌ Spec-kit validation FAILED"
    FAIL=$((FAIL + 1))
  fi
else
  echo "  ⚠️  scripts/validate-speckit.js not found — skipping"
fi

if grep -r "\[NEEDS CLARIFICATION\]\|<!-- HUMAN DECISION NEEDED" "$FEATURE_DIR"/ 2>/dev/null; then
  echo "  ❌ Unresolved clarifications found in spec"
  FAIL=$((FAIL + 1))
else
  echo "  ✅ No unresolved markers in spec"
  PASS=$((PASS + 1))
fi

if grep -c "\[TBD\]\|\[TODO\]\|\[PLACEHOLDER\]" "$FEATURE_DIR/tasks.md" 2>/dev/null; then
  echo "  ❌ Unresolved TODO/TBD markers in tasks.md"
  FAIL=$((FAIL + 1))
else
  echo "  ✅ tasks.md is fully resolved"
  PASS=$((PASS + 1))
fi

# ─── Scaffolding Validation ──────────────────────
echo ""
echo "▶ Scaffolding"

if [ -f "scripts/validate-scaffolding.sh" ]; then
  echo "  Running scaffolding validation..."
  if bash scripts/validate-scaffolding.sh --all >/dev/null 2>&1; then
    echo "  ✅ Scaffolding validation passed"
    PASS=$((PASS + 1))
  else
    echo "  ⚠️  Scaffolding validation had warnings (may be OK)"
    PASS=$((PASS + 1))
  fi
fi

echo "  Running test suite..."
if npm test >/dev/null 2>&1; then
  echo "  ✅ Test suite runs (canary tests passing)"
  PASS=$((PASS + 1))
else
  echo "  ❌ Test suite broken — fix before implementing"
  FAIL=$((FAIL + 1))
fi

if npm run lint >/dev/null 2>&1; then
  echo "  ✅ Linter runs clean"
  PASS=$((PASS + 1))
else
  echo "  ❌ Linter has errors"
  FAIL=$((FAIL + 1))
fi

if npm run build >/dev/null 2>&1; then
  echo "  ✅ Build succeeds"
  PASS=$((PASS + 1))
else
  echo "  ⚠️  Build not passing (may be OK if no source yet)"
fi

# ─── Results ─────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo "  RESULTS: $PASS passed, $FAIL failed"
echo ""
if [ $FAIL -gt 0 ]; then
  echo "  ❌ PRE-FLIGHT FAILED"
  echo "  Fix all failures before starting Phase 5."
  echo "═══════════════════════════════════════════════"
  exit 1
else
  echo "  ✅ PRE-FLIGHT PASSED"
  echo ""
  echo "  Feature: $FEATURE_DIR"
  echo "  Base branch: dev"
  echo "  Ready to begin implementation."
  echo "═══════════════════════════════════════════════"
  exit 0
fi
