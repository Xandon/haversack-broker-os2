#!/usr/bin/env bash
set -e

echo "=== Phase 5 Pre-Flight Check ==="
echo ""

PASS=0
FAIL=0
WARN=0

check() {
  local label="$1"
  shift
  if "$@" > /dev/null 2>&1; then
    echo "  [PASS] $label"
    PASS=$((PASS + 1))
  else
    echo "  [FAIL] $label"
    FAIL=$((FAIL + 1))
  fi
}

warn() {
  local label="$1"
  shift
  if "$@" > /dev/null 2>&1; then
    echo "  [PASS] $label"
    PASS=$((PASS + 1))
  else
    echo "  [WARN] $label (will be created during build)"
    WARN=$((WARN + 1))
  fi
}

# Runtime
check "Node.js >= 20" node -e "process.exit(parseInt(process.version.slice(1)) >= 20 ? 0 : 1)"
check "npm available" npm --version
check "TypeScript available" npx tsc --version

# Git state
check "Inside git repo" git rev-parse --is-inside-work-tree
check "Working tree clean" git diff --quiet HEAD

BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo ""
echo "  Current branch: $BRANCH"

# Project structure (required)
check "backend/ exists" test -d backend
check "frontend/ exists" test -d frontend
check "worker/ exists" test -d worker
check "packages/shared/ exists" test -d packages/shared
check "docs/prd.md exists" test -f docs/prd.md

# Project structure (created during build)
warn "prisma/ exists" test -d prisma

# Dependencies
check "node_modules installed" test -d node_modules

# Config files
check "tsconfig.base.json exists" test -f tsconfig.base.json
check "package.json exists" test -f package.json
check "vitest.config.ts exists" test -f vitest.config.ts

echo ""
echo "=== Results: $PASS passed, $FAIL failed, $WARN warnings ==="

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Pre-flight FAILED. Fix the issues above before continuing."
  exit 1
fi

echo ""
echo "Pre-flight PASSED. Ready for Phase 5."
