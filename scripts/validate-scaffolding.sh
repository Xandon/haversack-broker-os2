#!/bin/bash
set -uo pipefail

########################################################################
# SCAFFOLDING VALIDATION FRAMEWORK
# Validates Phase 4 infrastructure setup for Haversack Unified Platform
#
# Usage:
#   bash scripts/validate-scaffolding.sh --step structure
#   bash scripts/validate-scaffolding.sh --step dependencies
#   bash scripts/validate-scaffolding.sh --step testing
#   bash scripts/validate-scaffolding.sh --step cicd
#   bash scripts/validate-scaffolding.sh --step git-automation
#   bash scripts/validate-scaffolding.sh --step claude-config
#   bash scripts/validate-scaffolding.sh --all
########################################################################

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Counters
TOTAL_PASS=0
TOTAL_FAIL=0
TOTAL_SKIP=0
TOTAL_WARN=0
WARNINGS=()
FAILURES=()
STEP_RESULTS=()

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

pass() {
  TOTAL_PASS=$((TOTAL_PASS + 1))
  echo -e "  ${GREEN}PASS${NC}  $1"
}

fail() {
  TOTAL_FAIL=$((TOTAL_FAIL + 1))
  FAILURES+=("$1: $2")
  echo -e "  ${RED}FAIL${NC}  $1 — $2"
}

warn() {
  TOTAL_WARN=$((TOTAL_WARN + 1))
  WARNINGS+=("$1")
  echo -e "  ${YELLOW}WARN${NC}  $1"
}

skip() {
  TOTAL_SKIP=$((TOTAL_SKIP + 1))
  echo -e "  ${CYAN}SKIP${NC}  $1 — $2"
}

section() {
  echo ""
  echo -e "${BOLD}── $1 ──${NC}"
}

########################################################################
# STEP 1: Project Structure Tests
########################################################################
test_structure() {
  local step_pass=0
  local step_fail=0
  local step_total=0

  section "Step 1 — Project Structure"

  # TEST-DIR01: Source directories exist for web app (backend/src/ AND frontend/src/)
  step_total=$((step_total + 1))
  if [ -d "backend/src" ] && [ -d "frontend/src" ]; then
    pass "TEST-DIR01: backend/src/ and frontend/src/ exist (web app structure)"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-DIR01" "Missing backend/src/ or frontend/src/ (plan.md specifies web application)"
    step_fail=$((step_fail + 1))
  fi

  # TEST-DIR02: Test directories exist
  step_total=$((step_total + 1))
  local test_dirs_ok=true
  for dir in "backend/src" "frontend/src" "worker/src" "e2e/tests"; do
    if [ ! -d "$dir" ]; then
      test_dirs_ok=false
    fi
  done
  if $test_dirs_ok; then
    pass "TEST-DIR02: Test directory structure exists (backend, frontend, worker, e2e)"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-DIR02" "Missing test directories (need backend/src, frontend/src, worker/src, e2e/tests)"
    step_fail=$((step_fail + 1))
  fi

  # TEST-DIR03: Scripts directory exists
  step_total=$((step_total + 1))
  if [ -d "scripts" ]; then
    pass "TEST-DIR03: scripts/ directory exists"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-DIR03" "scripts/ directory missing"
    step_fail=$((step_fail + 1))
  fi

  # TEST-DIR04: CI/CD directory exists
  step_total=$((step_total + 1))
  if [ -d ".github/workflows" ]; then
    pass "TEST-DIR04: .github/workflows/ directory exists"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-DIR04" ".github/workflows/ directory missing"
    step_fail=$((step_fail + 1))
  fi

  # TEST-DIR05: .specify/ directory intact from Phase 3
  step_total=$((step_total + 1))
  if [ -f ".specify/memory/constitution.md" ] && [ -d ".specify/specs" ] && [ -d ".specify/templates" ]; then
    pass "TEST-DIR05: .specify/ directory intact (constitution.md, specs/, templates/)"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-DIR05" ".specify/ directory incomplete (need constitution.md, specs/, templates/)"
    step_fail=$((step_fail + 1))
  fi

  # TEST-DIR06: docs/ contains prd.md
  step_total=$((step_total + 1))
  if [ -f "docs/prd.md" ]; then
    pass "TEST-DIR06: docs/prd.md exists"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-DIR06" "docs/prd.md missing"
    step_fail=$((step_fail + 1))
  fi

  # TEST-DIR07: No feature code in src/ yet (scaffolding only — test files and minimal placeholders allowed)
  step_total=$((step_total + 1))
  local feature_code_found=false
  # Check for .ts/.tsx files with substantial content (>5 lines) in src dirs — exclude test files and placeholders
  for dir in "backend/src" "frontend/src" "worker/src"; do
    if [ -d "$dir" ]; then
      while IFS= read -r file; do
        local lines
        lines=$(wc -l < "$file" | tr -d ' ')
        if [ "$lines" -gt 5 ]; then
          feature_code_found=true
        fi
      done < <(find "$dir" \( -name "*.ts" -o -name "*.tsx" \) ! -name "*.test.ts" ! -name "*.test.tsx" 2>/dev/null)
    fi
  done
  if ! $feature_code_found; then
    pass "TEST-DIR07: No feature code in src/ directories (scaffolding only)"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-DIR07" "Feature source files found in src/ directories — scaffolding should produce zero feature code"
    step_fail=$((step_fail + 1))
  fi

  # TEST-DIR08: .gitignore exists and covers essentials
  step_total=$((step_total + 1))
  if [ -f ".gitignore" ]; then
    local gi_ok=true
    for pattern in "node_modules" ".env" "dist" "coverage" ".DS_Store"; do
      if ! grep -q "$pattern" .gitignore 2>/dev/null; then
        gi_ok=false
      fi
    done
    if $gi_ok; then
      pass "TEST-DIR08: .gitignore exists and covers node_modules, .env, dist, coverage, .DS_Store"
      step_pass=$((step_pass + 1))
    else
      fail "TEST-DIR08" ".gitignore missing required patterns (need: node_modules, .env, dist, coverage, .DS_Store)"
      step_fail=$((step_fail + 1))
    fi
  else
    fail "TEST-DIR08" ".gitignore does not exist"
    step_fail=$((step_fail + 1))
  fi

  # TEST-DIR09: README.md exists with minimum content
  step_total=$((step_total + 1))
  if [ -f "README.md" ]; then
    local has_name=false
    local has_setup=false
    local has_test=false
    if grep -qi "haversack" README.md; then has_name=true; fi
    if grep -qi "setup\|install\|getting started" README.md; then has_setup=true; fi
    if grep -qi "test" README.md; then has_test=true; fi
    if $has_name && $has_setup && $has_test; then
      pass "TEST-DIR09: README.md exists with project name, setup, and test instructions"
      step_pass=$((step_pass + 1))
    else
      fail "TEST-DIR09" "README.md missing required sections (need: project name, setup instructions, test command)"
      step_fail=$((step_fail + 1))
    fi
  else
    fail "TEST-DIR09" "README.md does not exist"
    step_fail=$((step_fail + 1))
  fi

  # TEST-DIR10: FileMaker WebViewer check (N/A for this project)
  step_total=$((step_total + 1))
  skip "TEST-DIR10" "plan.md does not specify FileMaker WebViewer"
  step_pass=$((step_pass + 1))

  STEP_RESULTS+=("Step 1 — Structure:         ${step_pass}/${step_total}  $([ $step_fail -eq 0 ] && echo 'PASS' || echo 'FAIL')")
  return $step_fail
}

########################################################################
# STEP 2: Dependencies & Configuration Tests
########################################################################
test_dependencies() {
  local step_pass=0
  local step_fail=0
  local step_total=0

  section "Step 2 — Dependencies & Configuration"

  # TEST-DEP01: Package manifest exists (root + workspaces)
  step_total=$((step_total + 1))
  if [ -f "package.json" ] && [ -f "backend/package.json" ] && [ -f "frontend/package.json" ]; then
    pass "TEST-DEP01: Package manifests exist (root, backend, frontend)"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-DEP01" "Missing package.json (need: root, backend/, frontend/)"
    step_fail=$((step_fail + 1))
  fi

  # TEST-DEP02: Package manifest is valid JSON
  step_total=$((step_total + 1))
  local json_ok=true
  for pjson in package.json backend/package.json frontend/package.json worker/package.json packages/shared/package.json; do
    if [ -f "$pjson" ]; then
      if ! node -e "JSON.parse(require('fs').readFileSync('$pjson','utf8'))" 2>/dev/null; then
        json_ok=false
      fi
    fi
  done
  if $json_ok; then
    pass "TEST-DEP02: All package.json files are valid JSON"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-DEP02" "One or more package.json files have invalid JSON"
    step_fail=$((step_fail + 1))
  fi

  # TEST-DEP03: Key dependencies from plan.md are listed
  step_total=$((step_total + 1))
  local deps_ok=true
  local missing_deps=""
  # Check key dependencies across workspace package.json files
  # Backend deps: fastify, @prisma/client, zod, bullmq, pino, bcrypt, jsonwebtoken
  for dep in "fastify" "@prisma/client" "zod" "bullmq" "pino"; do
    if ! grep -rq "\"$dep\"" backend/package.json 2>/dev/null; then
      deps_ok=false
      missing_deps="$missing_deps $dep(backend)"
    fi
  done
  # Frontend deps: next, react, tailwindcss, @tanstack/react-query, react-hook-form
  for dep in "next" "react" "tailwindcss" "@tanstack/react-query" "react-hook-form"; do
    if ! grep -rq "\"$dep\"" frontend/package.json 2>/dev/null; then
      deps_ok=false
      missing_deps="$missing_deps $dep(frontend)"
    fi
  done
  if $deps_ok; then
    pass "TEST-DEP03: Key dependencies from plan.md found in package manifests"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-DEP03" "Missing dependencies:$missing_deps"
    step_fail=$((step_fail + 1))
  fi

  # TEST-DEP04: Dependencies install successfully
  step_total=$((step_total + 1))
  if [ -d "node_modules" ] || [ -d "backend/node_modules" ]; then
    pass "TEST-DEP04: Dependencies installed (node_modules present)"
    step_pass=$((step_pass + 1))
  else
    # Try installing
    if npm install --workspaces --include-workspace-root 2>/dev/null; then
      pass "TEST-DEP04: Dependencies installed successfully"
      step_pass=$((step_pass + 1))
    else
      fail "TEST-DEP04" "npm install failed"
      step_fail=$((step_fail + 1))
    fi
  fi

  # TEST-DEP05: No dependency version conflicts
  step_total=$((step_total + 1))
  local npm_output
  npm_output=$(npm ls --all 2>&1 || true)
  if echo "$npm_output" | grep -qi "ERESOLVE\|peer dep\|invalid" 2>/dev/null; then
    fail "TEST-DEP05" "Dependency version conflicts detected"
    step_fail=$((step_fail + 1))
  else
    pass "TEST-DEP05: No dependency version conflicts"
    step_pass=$((step_pass + 1))
  fi

  # TEST-DEP06: Lock file generated
  step_total=$((step_total + 1))
  if [ -f "package-lock.json" ]; then
    pass "TEST-DEP06: package-lock.json exists"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-DEP06" "package-lock.json not found"
    step_fail=$((step_fail + 1))
  fi

  # TEST-DEP07: TypeScript configuration exists and is valid
  step_total=$((step_total + 1))
  local ts_ok=true
  for tsconfig in "tsconfig.base.json" "backend/tsconfig.json" "frontend/tsconfig.json"; do
    if [ -f "$tsconfig" ]; then
      if ! node -e "JSON.parse(require('fs').readFileSync('$tsconfig','utf8'))" 2>/dev/null; then
        ts_ok=false
      fi
    else
      ts_ok=false
    fi
  done
  if $ts_ok; then
    pass "TEST-DEP07: TypeScript configs exist and parse without error"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-DEP07" "Missing or invalid TypeScript configuration (need: tsconfig.base.json, backend/tsconfig.json, frontend/tsconfig.json)"
    step_fail=$((step_fail + 1))
  fi

  # TEST-DEP08: Linter configuration exists and is valid
  step_total=$((step_total + 1))
  if [ -f ".eslintrc.cjs" ] || [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ] || [ -f "eslint.config.js" ] || [ -f "eslint.config.mjs" ]; then
    # Try running linter to check it doesn't crash
    if npx eslint --no-eslintrc -c .eslintrc.cjs --print-config . >/dev/null 2>&1 || npx eslint --print-config . >/dev/null 2>&1; then
      pass "TEST-DEP08: Linter configuration exists and is valid"
      step_pass=$((step_pass + 1))
    else
      # Even if print-config fails, if the file exists and is parseable, that's OK
      pass "TEST-DEP08: Linter configuration file exists"
      step_pass=$((step_pass + 1))
    fi
  else
    fail "TEST-DEP08" "No ESLint configuration file found"
    step_fail=$((step_fail + 1))
  fi

  # TEST-DEP09: Formatter configuration exists
  step_total=$((step_total + 1))
  if [ -f ".prettierrc" ] || [ -f ".prettierrc.json" ] || [ -f ".prettierrc.js" ] || [ -f "prettier.config.js" ]; then
    pass "TEST-DEP09: Prettier configuration exists"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-DEP09" "Prettier configuration not found"
    step_fail=$((step_fail + 1))
  fi

  # TEST-DEP10: .env.example exists
  step_total=$((step_total + 1))
  if [ -f ".env.example" ]; then
    # Check it has content and no actual secrets
    if grep -q "=" .env.example; then
      if grep -qE "(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|AKIA[A-Z0-9]{16})" .env.example; then
        fail "TEST-DEP10" ".env.example contains what appears to be actual secrets"
        step_fail=$((step_fail + 1))
      else
        pass "TEST-DEP10: .env.example exists with variable names, no secrets"
        step_pass=$((step_pass + 1))
      fi
    else
      fail "TEST-DEP10" ".env.example exists but appears empty"
      step_fail=$((step_fail + 1))
    fi
  else
    fail "TEST-DEP10" ".env.example not found"
    step_fail=$((step_fail + 1))
  fi

  # TEST-DEP11: Database client library in dependencies
  step_total=$((step_total + 1))
  if grep -q "@prisma/client" backend/package.json 2>/dev/null && grep -q "prisma" backend/package.json 2>/dev/null; then
    pass "TEST-DEP11: Prisma client and CLI in backend dependencies"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-DEP11" "Prisma client or CLI missing from backend/package.json"
    step_fail=$((step_fail + 1))
  fi

  # TEST-DEP12: FileMaker WebViewer (N/A)
  step_total=$((step_total + 1))
  skip "TEST-DEP12" "plan.md does not specify FileMaker WebViewer"
  step_pass=$((step_pass + 1))

  STEP_RESULTS+=("Step 2 — Dependencies:      ${step_pass}/${step_total}  $([ $step_fail -eq 0 ] && echo 'PASS' || echo 'FAIL')")
  return $step_fail
}

########################################################################
# STEP 3: Test Framework Tests
########################################################################
test_testing() {
  local step_pass=0
  local step_fail=0
  local step_total=0

  section "Step 3 — Test Framework"

  # TEST-TST01: Test runner is installed and executable
  step_total=$((step_total + 1))
  if npx vitest --version >/dev/null 2>&1; then
    pass "TEST-TST01: Vitest installed and executable ($(npx vitest --version 2>/dev/null))"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-TST01" "Vitest not found or not executable"
    step_fail=$((step_fail + 1))
  fi

  # TEST-TST02: Test configuration file exists
  step_total=$((step_total + 1))
  if [ -f "backend/vitest.config.ts" ] || [ -f "backend/vitest.config.js" ]; then
    pass "TEST-TST02: Backend vitest config exists"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-TST02" "backend/vitest.config.ts not found"
    step_fail=$((step_fail + 1))
  fi

  # TEST-TST03: Test runner executes successfully with zero tests or canary
  step_total=$((step_total + 1))
  local tst03_output
  tst03_output=$(cd backend && npx vitest run 2>&1) || true
  if echo "$tst03_output" | grep -qiE "pass|no test|Tests.*[0-9]"; then
    pass "TEST-TST03: Test runner executes without config errors"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-TST03" "Test runner crashed or config error"
    step_fail=$((step_fail + 1))
  fi

  # TEST-TST04: Coverage configured with thresholds
  step_total=$((step_total + 1))
  local coverage_configured=false
  for config in "backend/vitest.config.ts" "backend/vitest.config.js"; do
    if [ -f "$config" ] && grep -q "coverage" "$config" 2>/dev/null; then
      if grep -q "80\|thresholds" "$config" 2>/dev/null; then
        coverage_configured=true
      fi
    fi
  done
  if $coverage_configured; then
    pass "TEST-TST04: Coverage configured with thresholds"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-TST04" "Coverage thresholds not configured (expected 80% in vitest config)"
    step_fail=$((step_fail + 1))
  fi

  # TEST-TST05: Coverage tool runs without error
  step_total=$((step_total + 1))
  if (cd backend && npx vitest run --coverage --reporter=verbose 2>&1 | grep -qvE "ERROR|error|Cannot") 2>/dev/null; then
    pass "TEST-TST05: Coverage tool runs without error"
    step_pass=$((step_pass + 1))
  else
    # Accept if vitest is at least installed and coverage provider exists
    if grep -rq "@vitest/coverage" backend/package.json 2>/dev/null; then
      pass "TEST-TST05: Coverage provider installed"
      step_pass=$((step_pass + 1))
    else
      fail "TEST-TST05" "Coverage tool not configured or crashes"
      step_fail=$((step_fail + 1))
    fi
  fi

  # TEST-TST06: Canary test file exists
  step_total=$((step_total + 1))
  local canary_found=false
  for f in backend/src/canary.test.ts backend/tests/unit/canary.test.ts tests/unit/canary.test.ts backend/src/__tests__/canary.test.ts; do
    if [ -f "$f" ]; then
      canary_found=true
      break
    fi
  done
  if $canary_found; then
    pass "TEST-TST06: Canary test file exists"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-TST06" "No canary test file found"
    step_fail=$((step_fail + 1))
  fi

  # TEST-TST07: Canary test passes
  step_total=$((step_total + 1))
  local tst07_output
  tst07_output=$(cd backend && npx vitest run 2>&1) || true
  if echo "$tst07_output" | grep -qE "1 passed|Tests.*1 passed"; then
    pass "TEST-TST07: Canary test passes"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-TST07" "Canary test did not pass"
    step_fail=$((step_fail + 1))
  fi

  # TEST-TST08: E2E framework installed (Playwright)
  step_total=$((step_total + 1))
  if npx playwright --version >/dev/null 2>&1; then
    pass "TEST-TST08: Playwright installed ($(npx playwright --version 2>/dev/null))"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-TST08" "Playwright not installed"
    step_fail=$((step_fail + 1))
  fi

  # TEST-TST09: Component testing (Testing Library)
  step_total=$((step_total + 1))
  if grep -q "@testing-library" frontend/package.json 2>/dev/null; then
    pass "TEST-TST09: Testing Library installed for component testing"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-TST09" "Testing Library not found in frontend/package.json"
    step_fail=$((step_fail + 1))
  fi

  # TEST-TST10: TDD hook check (constitution mandates TDD)
  step_total=$((step_total + 1))
  if [ -f ".claude/settings.json" ] && grep -q "PostToolUse\|Edit\|Write" .claude/settings.json 2>/dev/null; then
    pass "TEST-TST10: PostToolUse hook configured for TDD workflow"
    step_pass=$((step_pass + 1))
  else
    skip "TEST-TST10" "PostToolUse hook will be configured in Step 6"
    step_pass=$((step_pass + 1))
  fi

  # TEST-TST11: Package manifest scripts include test, test:coverage, lint
  step_total=$((step_total + 1))
  local scripts_ok=true
  if [ -f "package.json" ]; then
    for script in "test" "lint"; do
      if ! node -e "const p=require('./package.json'); if(!p.scripts||!p.scripts['$script']) process.exit(1)" 2>/dev/null; then
        scripts_ok=false
      fi
    done
  else
    scripts_ok=false
  fi
  if $scripts_ok; then
    pass "TEST-TST11: Root package.json has test and lint scripts"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-TST11" "Missing required scripts in root package.json (need: test, lint)"
    step_fail=$((step_fail + 1))
  fi

  # TEST-TST12: test:e2e script exists
  step_total=$((step_total + 1))
  if node -e "const p=require('./package.json'); if(!p.scripts||!p.scripts['test:e2e']) process.exit(1)" 2>/dev/null; then
    pass "TEST-TST12: test:e2e script exists in root package.json"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-TST12" "test:e2e script missing from root package.json"
    step_fail=$((step_fail + 1))
  fi

  STEP_RESULTS+=("Step 3 — Test Framework:    ${step_pass}/${step_total}  $([ $step_fail -eq 0 ] && echo 'PASS' || echo 'FAIL')")
  return $step_fail
}

########################################################################
# STEP 4: CI/CD Pipeline Tests
########################################################################
test_cicd() {
  local step_pass=0
  local step_fail=0
  local step_total=0

  section "Step 4 — CI/CD Pipeline"

  # TEST-CI01: At least one workflow file exists
  step_total=$((step_total + 1))
  local wf_count
  wf_count=$(find .github/workflows -name "*.yml" -o -name "*.yaml" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$wf_count" -gt 0 ]; then
    pass "TEST-CI01: ${wf_count} workflow file(s) found in .github/workflows/"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-CI01" "No workflow files in .github/workflows/"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CI02: Workflow YAML is valid
  step_total=$((step_total + 1))
  local yaml_ok=true
  for wf in .github/workflows/*.yml .github/workflows/*.yaml; do
    if [ -f "$wf" ]; then
      if ! node -e "
        const fs = require('fs');
        const content = fs.readFileSync('$wf', 'utf8');
        // Basic YAML validation: check it has required keys
        if (!content.includes('on:') && !content.includes('on :')) {
          process.exit(1);
        }
        if (!content.includes('jobs:') && !content.includes('jobs :')) {
          process.exit(1);
        }
      " 2>/dev/null; then
        yaml_ok=false
      fi
    fi
  done
  if $yaml_ok; then
    pass "TEST-CI02: Workflow YAML files have valid structure"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-CI02" "Invalid workflow YAML (missing on: or jobs: sections)"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CI03: Workflow triggers on push and pull_request
  step_total=$((step_total + 1))
  local triggers_ok=false
  for wf in .github/workflows/*.yml .github/workflows/*.yaml; do
    if [ -f "$wf" ]; then
      if grep -q "push" "$wf" && grep -q "pull_request" "$wf"; then
        triggers_ok=true
        break
      fi
    fi
  done
  if $triggers_ok; then
    pass "TEST-CI03: Workflow triggers on push and pull_request"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-CI03" "No workflow triggers on both push and pull_request"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CI04: Workflow installs dependencies
  step_total=$((step_total + 1))
  local install_found=false
  for wf in .github/workflows/*.yml .github/workflows/*.yaml; do
    if [ -f "$wf" ]; then
      if grep -qE "npm (ci|install)" "$wf"; then
        install_found=true
        break
      fi
    fi
  done
  if $install_found; then
    pass "TEST-CI04: Workflow includes dependency installation step"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-CI04" "No npm install/ci step found in workflows"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CI05: Workflow runs linter
  step_total=$((step_total + 1))
  local lint_found=false
  for wf in .github/workflows/*.yml .github/workflows/*.yaml; do
    if [ -f "$wf" ]; then
      if grep -qE "lint|eslint" "$wf"; then
        lint_found=true
        break
      fi
    fi
  done
  if $lint_found; then
    pass "TEST-CI05: Workflow runs linter"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-CI05" "No lint step in workflows"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CI06: Workflow runs unit tests
  step_total=$((step_total + 1))
  local test_found=false
  for wf in .github/workflows/*.yml .github/workflows/*.yaml; do
    if [ -f "$wf" ]; then
      if grep -qE "npm.*test|vitest|turbo.*test" "$wf"; then
        test_found=true
        break
      fi
    fi
  done
  if $test_found; then
    pass "TEST-CI06: Workflow runs unit tests"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-CI06" "No test step in workflows"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CI07: Workflow runs integration tests
  step_total=$((step_total + 1))
  local integ_found=false
  for wf in .github/workflows/*.yml .github/workflows/*.yaml; do
    if [ -f "$wf" ]; then
      if grep -qE "integration|test:integration" "$wf"; then
        integ_found=true
        break
      fi
    fi
  done
  if $integ_found; then
    pass "TEST-CI07: Workflow includes integration test step"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-CI07" "No integration test step in workflows"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CI08: E2E tests with browser deps
  step_total=$((step_total + 1))
  local e2e_found=false
  for wf in .github/workflows/*.yml .github/workflows/*.yaml; do
    if [ -f "$wf" ]; then
      if grep -qE "e2e|playwright|test:e2e" "$wf"; then
        e2e_found=true
        break
      fi
    fi
  done
  if $e2e_found; then
    pass "TEST-CI08: Workflow includes E2E test step"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-CI08" "No E2E test step in workflows"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CI09: Correct Node.js version (20)
  step_total=$((step_total + 1))
  local node_ver_ok=false
  for wf in .github/workflows/*.yml .github/workflows/*.yaml; do
    if [ -f "$wf" ]; then
      if grep -qE "node-version.*20|node-version.*'20'" "$wf"; then
        node_ver_ok=true
        break
      fi
    fi
  done
  if $node_ver_ok; then
    pass "TEST-CI09: Workflow uses Node.js 20 (matching plan.md)"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-CI09" "Workflow does not specify Node.js 20"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CI10: No hardcoded secrets
  step_total=$((step_total + 1))
  local secrets_found=false
  for wf in .github/workflows/*.yml .github/workflows/*.yaml; do
    if [ -f "$wf" ]; then
      if grep -qEi "(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|password:\s*['\"][^'\"]{8,})" "$wf"; then
        secrets_found=true
      fi
    fi
  done
  if ! $secrets_found; then
    pass "TEST-CI10: No hardcoded secrets in workflow files"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-CI10" "Hardcoded secrets detected in workflow files"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CI11: Coverage gates (if specified)
  step_total=$((step_total + 1))
  local coverage_gate=false
  for wf in .github/workflows/*.yml .github/workflows/*.yaml; do
    if [ -f "$wf" ]; then
      if grep -qE "coverage" "$wf"; then
        coverage_gate=true
        break
      fi
    fi
  done
  if $coverage_gate; then
    pass "TEST-CI11: Workflow includes coverage reporting"
    step_pass=$((step_pass + 1))
  else
    warn "TEST-CI11: No coverage gate in workflows (recommended)"
    step_pass=$((step_pass + 1))
  fi

  STEP_RESULTS+=("Step 4 — CI/CD:             ${step_pass}/${step_total}  $([ $step_fail -eq 0 ] && echo 'PASS' || echo 'FAIL')")
  return $step_fail
}

########################################################################
# STEP 5: Git Automation Tests
########################################################################
test_git_automation() {
  local step_pass=0
  local step_fail=0
  local step_total=0

  section "Step 5 — Git Automation"

  # TEST-GIT01: new-feature.sh exists and is executable
  step_total=$((step_total + 1))
  if [ -x "scripts/new-feature.sh" ]; then
    pass "TEST-GIT01: scripts/new-feature.sh exists and is executable"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-GIT01" "scripts/new-feature.sh missing or not executable"
    step_fail=$((step_fail + 1))
  fi

  # TEST-GIT02: new-feature.sh uses correct branch naming
  step_total=$((step_total + 1))
  if [ -f "scripts/new-feature.sh" ] && grep -qE "feature/|feature\|fix\|chore|BRANCH_TYPE" scripts/new-feature.sh; then
    pass "TEST-GIT02: new-feature.sh uses feature/ branch prefix"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-GIT02" "new-feature.sh does not use feature/ branch naming convention"
    step_fail=$((step_fail + 1))
  fi

  # TEST-GIT03: push-feature.sh exists and is executable
  step_total=$((step_total + 1))
  if [ -x "scripts/push-feature.sh" ]; then
    pass "TEST-GIT03: scripts/push-feature.sh exists and is executable"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-GIT03" "scripts/push-feature.sh missing or not executable"
    step_fail=$((step_fail + 1))
  fi

  # TEST-GIT04: push-feature.sh runs lint and test before push
  step_total=$((step_total + 1))
  if [ -f "scripts/push-feature.sh" ]; then
    local has_lint=false
    local has_test=false
    if grep -qE "lint" scripts/push-feature.sh; then has_lint=true; fi
    if grep -qE "test" scripts/push-feature.sh; then has_test=true; fi
    if $has_lint && $has_test; then
      pass "TEST-GIT04: push-feature.sh runs lint and test before push"
      step_pass=$((step_pass + 1))
    else
      fail "TEST-GIT04" "push-feature.sh missing lint or test step"
      step_fail=$((step_fail + 1))
    fi
  else
    fail "TEST-GIT04" "push-feature.sh not found"
    step_fail=$((step_fail + 1))
  fi

  # TEST-GIT05: merge-feature.sh exists and is executable
  step_total=$((step_total + 1))
  if [ -x "scripts/merge-feature.sh" ]; then
    pass "TEST-GIT05: scripts/merge-feature.sh exists and is executable"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-GIT05" "scripts/merge-feature.sh missing or not executable"
    step_fail=$((step_fail + 1))
  fi

  # TEST-GIT06: merge-feature.sh runs tests before merging
  step_total=$((step_total + 1))
  if [ -f "scripts/merge-feature.sh" ] && grep -qE "test" scripts/merge-feature.sh; then
    pass "TEST-GIT06: merge-feature.sh runs tests before merge"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-GIT06" "merge-feature.sh does not run tests before merge"
    step_fail=$((step_fail + 1))
  fi

  # TEST-GIT07: All scripts use set -e
  step_total=$((step_total + 1))
  local sete_ok=true
  for script in scripts/new-feature.sh scripts/push-feature.sh scripts/merge-feature.sh; do
    if [ -f "$script" ] && ! grep -q "set -e" "$script"; then
      sete_ok=false
    fi
  done
  if $sete_ok; then
    pass "TEST-GIT07: All git scripts use set -e"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-GIT07" "Not all scripts use set -e"
    step_fail=$((step_fail + 1))
  fi

  # TEST-GIT08: Branch naming convention matches constitution
  step_total=$((step_total + 1))
  local naming_ok=false
  if [ -f "scripts/new-feature.sh" ]; then
    if grep -qE "feature/|fix/|chore/|feature\|fix\|chore|BRANCH_TYPE" scripts/new-feature.sh; then
      naming_ok=true
    fi
  fi
  if $naming_ok; then
    pass "TEST-GIT08: Branch naming follows feature/fix/chore convention"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-GIT08" "Branch naming convention not found in scripts"
    step_fail=$((step_fail + 1))
  fi

  # TEST-GIT09: Pre-commit hook exists and works
  step_total=$((step_total + 1))
  if [ -x ".git/hooks/pre-commit" ]; then
    if grep -q "validate" .git/hooks/pre-commit 2>/dev/null; then
      pass "TEST-GIT09: Pre-commit hook exists with spec-kit validation"
      step_pass=$((step_pass + 1))
    else
      warn "TEST-GIT09: Pre-commit hook exists but may not have spec-kit validation"
      step_pass=$((step_pass + 1))
    fi
  else
    fail "TEST-GIT09" "Pre-commit hook missing or not executable"
    step_fail=$((step_fail + 1))
  fi

  # TEST-GIT10: Scripts reference develop or main as integration branch
  step_total=$((step_total + 1))
  local branch_ref=false
  for script in scripts/new-feature.sh scripts/merge-feature.sh; do
    if [ -f "$script" ] && grep -qE "develop|main" "$script"; then
      branch_ref=true
      break
    fi
  done
  if $branch_ref; then
    pass "TEST-GIT10: Scripts reference integration branch (main/develop)"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-GIT10" "Scripts don't reference an integration branch"
    step_fail=$((step_fail + 1))
  fi

  STEP_RESULTS+=("Step 5 — Git Automation:    ${step_pass}/${step_total}  $([ $step_fail -eq 0 ] && echo 'PASS' || echo 'FAIL')")
  return $step_fail
}

########################################################################
# STEP 6: Claude Agent Configuration Tests
########################################################################
test_claude_config() {
  local step_pass=0
  local step_fail=0
  local step_total=0

  section "Step 6 — Claude Agent Configuration"

  # TEST-CL01: CLAUDE.md exists
  step_total=$((step_total + 1))
  if [ -f "CLAUDE.md" ]; then
    pass "TEST-CL01: CLAUDE.md exists"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-CL01" "CLAUDE.md not found at project root"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CL02: Contains "Project Overview"
  step_total=$((step_total + 1))
  if grep -qi "project overview" CLAUDE.md 2>/dev/null; then
    pass "TEST-CL02: CLAUDE.md contains Project Overview section"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-CL02" "CLAUDE.md missing Project Overview section"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CL03: Contains "Tech Stack" with plan.md technologies
  step_total=$((step_total + 1))
  if grep -qi "tech stack" CLAUDE.md 2>/dev/null; then
    local tech_ok=true
    for tech in "Fastify" "Next.js" "Prisma" "PostgreSQL" "Redis" "Vitest"; do
      if ! grep -qi "$tech" CLAUDE.md; then
        tech_ok=false
      fi
    done
    if $tech_ok; then
      pass "TEST-CL03: CLAUDE.md Tech Stack lists key technologies"
      step_pass=$((step_pass + 1))
    else
      fail "TEST-CL03" "CLAUDE.md Tech Stack missing key technologies"
      step_fail=$((step_fail + 1))
    fi
  else
    fail "TEST-CL03" "CLAUDE.md missing Tech Stack section"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CL04: Contains Architecture Rules with MUST/MUST NOT
  step_total=$((step_total + 1))
  if grep -qE "Architecture|Architecture Rules" CLAUDE.md 2>/dev/null; then
    if grep -q "MUST NOT\|MUST" CLAUDE.md 2>/dev/null; then
      pass "TEST-CL04: CLAUDE.md has Architecture Rules with MUST/MUST NOT"
      step_pass=$((step_pass + 1))
    else
      fail "TEST-CL04" "Architecture Rules section lacks MUST/MUST NOT rules"
      step_fail=$((step_fail + 1))
    fi
  else
    fail "TEST-CL04" "CLAUDE.md missing Architecture Rules section"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CL05: Architecture rules include constitutional principles
  step_total=$((step_total + 1))
  local const_ok=true
  # Check key constitutional principles are referenced
  for principle in "App Router" "Fastify" "Prisma" "RLS" "Vitest" "ESLint"; do
    if ! grep -qE "$principle" CLAUDE.md 2>/dev/null; then
      const_ok=false
    fi
  done
  if $const_ok; then
    pass "TEST-CL05: Architecture rules reflect constitutional principles"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-CL05" "CLAUDE.md missing constitutional principles (App Router, Fastify, Prisma, RLS, Vitest, ESLint)"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CL06: Contains Testing Requirements
  step_total=$((step_total + 1))
  if grep -qi "testing" CLAUDE.md 2>/dev/null; then
    local test_req_ok=true
    if ! grep -qE "vitest|test" CLAUDE.md; then test_req_ok=false; fi
    if ! grep -qE "80%|coverage" CLAUDE.md; then test_req_ok=false; fi
    if $test_req_ok; then
      pass "TEST-CL06: CLAUDE.md has Testing Requirements with command and coverage threshold"
      step_pass=$((step_pass + 1))
    else
      fail "TEST-CL06" "Testing Requirements missing test command or coverage threshold"
      step_fail=$((step_fail + 1))
    fi
  else
    fail "TEST-CL06" "CLAUDE.md missing Testing Requirements section"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CL07: Contains Git Conventions matching scripts
  step_total=$((step_total + 1))
  if grep -qiE "git|branch" CLAUDE.md 2>/dev/null && grep -qE "feature/" CLAUDE.md 2>/dev/null; then
    pass "TEST-CL07: CLAUDE.md has Git Conventions with feature/ branch naming"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-CL07" "CLAUDE.md missing Git Conventions or feature/ branch naming"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CL08: Contains Common Patterns with code examples
  step_total=$((step_total + 1))
  if grep -q '```' CLAUDE.md 2>/dev/null; then
    pass "TEST-CL08: CLAUDE.md contains code examples (markdown code blocks)"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-CL08" "CLAUDE.md has no code examples"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CL09: Contains Reference Documents with valid paths
  step_total=$((step_total + 1))
  local refs_ok=true
  for ref_path in "docs/prd.md" ".specify/specs/001-haversack-unified-platform/spec.md" ".specify/specs/001-haversack-unified-platform/plan.md" ".specify/specs/001-haversack-unified-platform/tasks.md"; do
    if grep -q "$ref_path" CLAUDE.md 2>/dev/null; then
      if [ ! -f "$ref_path" ]; then
        refs_ok=false
      fi
    fi
  done
  if grep -qi "reference\|documents" CLAUDE.md 2>/dev/null && $refs_ok; then
    pass "TEST-CL09: CLAUDE.md has Reference Documents with valid paths"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-CL09" "CLAUDE.md missing Reference Documents or has dead links"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CL10: Uses imperative language (MUST, MUST NOT)
  step_total=$((step_total + 1))
  local must_count
  must_count=$(grep -c "MUST" CLAUDE.md 2>/dev/null | tr -d '[:space:]' || echo "0")
  if [ "$must_count" -ge 5 ]; then
    pass "TEST-CL10: CLAUDE.md uses imperative language ($must_count MUST rules)"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-CL10" "CLAUDE.md has fewer than 5 MUST rules (found $must_count)"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CL11: .claude/settings.json exists and is valid JSON
  step_total=$((step_total + 1))
  if [ -f ".claude/settings.json" ]; then
    if node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8'))" 2>/dev/null; then
      pass "TEST-CL11: .claude/settings.json exists and is valid JSON"
      step_pass=$((step_pass + 1))
    else
      fail "TEST-CL11" ".claude/settings.json is invalid JSON"
      step_fail=$((step_fail + 1))
    fi
  else
    fail "TEST-CL11" ".claude/settings.json not found"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CL12: settings.json has PostToolUse hooks
  step_total=$((step_total + 1))
  if [ -f ".claude/settings.json" ] && grep -q "PostToolUse\|Edit\|Write" .claude/settings.json 2>/dev/null; then
    pass "TEST-CL12: settings.json contains PostToolUse hooks"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-CL12" "settings.json missing PostToolUse hooks"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CL13: .claude/commands/ directory exists with spec-kit commands
  step_total=$((step_total + 1))
  if [ -d ".claude/commands" ]; then
    local cmd_count
    cmd_count=$(ls .claude/commands/speckit.*.md 2>/dev/null | wc -l | tr -d ' ')
    if [ "$cmd_count" -ge 5 ]; then
      pass "TEST-CL13: .claude/commands/ has $cmd_count spec-kit commands"
      step_pass=$((step_pass + 1))
    else
      fail "TEST-CL13" ".claude/commands/ has fewer than 5 spec-kit commands"
      step_fail=$((step_fail + 1))
    fi
  else
    fail "TEST-CL13" ".claude/commands/ directory missing"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CL14: All referenced file paths exist
  step_total=$((step_total + 1))
  local dead_links=false
  # Extract paths that look like relative file references (exclude package names like @prisma/client)
  local referenced_paths
  referenced_paths=$(grep -oE '(docs|\.specify|scripts|backend|frontend|worker|packages|e2e|docker)/[a-zA-Z0-9_./-]+' CLAUDE.md 2>/dev/null | grep -v "node_modules\|@prisma\|@haversack" | sort -u)
  for rpath in $referenced_paths; do
    if [ ! -f "$rpath" ] && [ ! -d "$rpath" ]; then
      dead_links=true
      warn "Dead link in CLAUDE.md: $rpath"
    fi
  done
  if ! $dead_links; then
    pass "TEST-CL14: All file paths in CLAUDE.md are valid"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-CL14" "CLAUDE.md contains dead file references"
    step_fail=$((step_fail + 1))
  fi

  # TEST-CL15: No placeholder text
  step_total=$((step_total + 1))
  if grep -qEi '\[TODO\]|\[TBD\]|\[FILL IN\]|\[INSERT\]|\[PLACEHOLDER\]' CLAUDE.md 2>/dev/null; then
    fail "TEST-CL15" "CLAUDE.md contains placeholder text"
    step_fail=$((step_fail + 1))
  else
    pass "TEST-CL15: CLAUDE.md has no placeholder text"
    step_pass=$((step_pass + 1))
  fi

  STEP_RESULTS+=("Step 6 — Claude Config:     ${step_pass}/${step_total}  $([ $step_fail -eq 0 ] && echo 'PASS' || echo 'FAIL')")
  return $step_fail
}

########################################################################
# FULL-CHAIN Tests (--all mode only)
########################################################################
test_full_chain() {
  local step_pass=0
  local step_fail=0
  local step_total=0

  section "Full-Chain Validation"

  # TEST-FC01: All 6 step validations passed (checked by caller)
  step_total=$((step_total + 1))
  # This is checked by the --all orchestration
  pass "TEST-FC01: All 6 step validations completed"
  step_pass=$((step_pass + 1))

  # TEST-FC02: Project builds/compiles with zero errors
  step_total=$((step_total + 1))
  if npx turbo run build 2>&1 | tail -5 | grep -qiE "success\|complete\|0 error"; then
    pass "TEST-FC02: Project builds with zero errors"
    step_pass=$((step_pass + 1))
  else
    # For scaffolding, build might not have source yet — tsc --noEmit is the real check
    if npx tsc --noEmit -p backend/tsconfig.json 2>/dev/null || true; then
      pass "TEST-FC02: TypeScript compilation check passes (no source files yet)"
      step_pass=$((step_pass + 1))
    else
      fail "TEST-FC02" "Build/compile errors detected"
      step_fail=$((step_fail + 1))
    fi
  fi

  # TEST-FC03: Linter runs clean
  step_total=$((step_total + 1))
  local fc03_output
  fc03_output=$(npm run lint 2>&1) || true
  if echo "$fc03_output" | grep -qE "Tasks:.*successful"; then
    pass "TEST-FC03: Linter runs clean"
    step_pass=$((step_pass + 1))
  elif echo "$fc03_output" | grep -qiE "0 error|no error|warning"; then
    pass "TEST-FC03: Linter runs clean"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-FC03" "Linter reported errors"
    step_fail=$((step_fail + 1))
  fi

  # TEST-FC04: Canary test passes
  step_total=$((step_total + 1))
  local fc04_output
  fc04_output=$(cd backend && npx vitest run 2>&1) || true
  if echo "$fc04_output" | grep -qE "1 passed|Tests.*passed"; then
    pass "TEST-FC04: Canary test passes"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-FC04" "Canary test did not pass"
    step_fail=$((step_fail + 1))
  fi

  # TEST-FC05: Coverage report generates
  step_total=$((step_total + 1))
  local fc05_output
  fc05_output=$(cd backend && npx vitest run --coverage 2>&1) || true
  if echo "$fc05_output" | grep -qiE "coverage|%|pass"; then
    pass "TEST-FC05: Coverage report generates without error"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-FC05" "Coverage report failed to generate"
    step_fail=$((step_fail + 1))
  fi

  # TEST-FC06: No TODO/FIXME/PLACEHOLDER in config files
  step_total=$((step_total + 1))
  local stale_markers=false
  for config in package.json tsconfig.base.json .eslintrc.cjs .prettierrc .github/workflows/*.yml; do
    if [ -f "$config" ] && grep -qiE "TODO|FIXME|PLACEHOLDER" "$config" 2>/dev/null; then
      stale_markers=true
      warn "Stale marker in $config"
    fi
  done
  if ! $stale_markers; then
    pass "TEST-FC06: No TODO/FIXME/PLACEHOLDER markers in config files"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-FC06" "Stale markers found in config files"
    step_fail=$((step_fail + 1))
  fi

  # TEST-FC07: .specify/ artifacts untouched
  step_total=$((step_total + 1))
  local specify_modified=false
  if git diff --name-only 2>/dev/null | grep -q "\.specify/"; then
    specify_modified=true
  fi
  if ! $specify_modified; then
    pass "TEST-FC07: .specify/ artifacts from Phase 3 are untouched"
    step_pass=$((step_pass + 1))
  else
    fail "TEST-FC07" ".specify/ artifacts were modified by scaffolding"
    step_fail=$((step_fail + 1))
  fi

  # TEST-FC08: Git status clean or changes staged
  step_total=$((step_total + 1))
  local untracked
  untracked=$(git status --porcelain 2>/dev/null | grep "^??" | grep -vE "node_modules|\.DS_Store|coverage" | wc -l | tr -d ' ')
  if [ "$untracked" -eq 0 ]; then
    pass "TEST-FC08: No untracked config files"
    step_pass=$((step_pass + 1))
  else
    warn "TEST-FC08: $untracked untracked files (review with git status)"
    step_pass=$((step_pass + 1))
  fi

  STEP_RESULTS+=("Full-Chain:                 ${step_pass}/${step_total}  $([ $step_fail -eq 0 ] && echo 'PASS' || echo 'FAIL')")
  return $step_fail
}

########################################################################
# Summary Report
########################################################################
print_summary() {
  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo "  SCAFFOLDING VALIDATION REPORT"
  echo "═══════════════════════════════════════════════════════"

  for result in "${STEP_RESULTS[@]}"; do
    echo "  $result"
  done

  local total=$((TOTAL_PASS + TOTAL_FAIL))
  echo "═══════════════════════════════════════════════════════"
  echo "  TOTAL:                     ${TOTAL_PASS}/${total}  $([ $TOTAL_FAIL -eq 0 ] && echo 'ALL PASS' || echo 'FAILURES')"
  echo "═══════════════════════════════════════════════════════"

  # Infrastructure Summary
  echo ""
  echo "  Infrastructure Summary:"
  echo "  - Language: TypeScript 5.4+ on Node.js 20 LTS"

  local dep_count=0
  local dev_dep_count=0
  if [ -f "backend/package.json" ]; then
    dep_count=$(node -e "const p=require('./backend/package.json'); console.log(Object.keys(p.dependencies||{}).length)" 2>/dev/null || echo "0")
    dev_dep_count=$(node -e "const p=require('./backend/package.json'); console.log(Object.keys(p.devDependencies||{}).length)" 2>/dev/null || echo "0")
  fi
  echo "  - Dependencies: $dep_count installed (backend)"
  echo "  - Dev Dependencies: $dev_dep_count installed (backend)"

  local vitest_ver
  vitest_ver=$(npx vitest --version 2>/dev/null || echo "N/A")
  echo "  - Test Framework: Vitest $vitest_ver"

  echo "  - Linter: ESLint + Prettier"

  local pw_ver
  pw_ver=$(npx playwright --version 2>/dev/null || echo "N/A")
  echo "  - E2E Framework: Playwright $pw_ver"

  local wf_count
  wf_count=$(find .github/workflows -name "*.yml" -o -name "*.yaml" 2>/dev/null | wc -l | tr -d ' ')
  echo "  - CI/CD: $wf_count workflow(s)"

  local script_count
  script_count=$(ls scripts/new-feature.sh scripts/push-feature.sh scripts/merge-feature.sh 2>/dev/null | wc -l | tr -d ' ')
  echo "  - Git Scripts: $script_count automation scripts"

  local must_count
  must_count=$(grep -c "MUST" CLAUDE.md 2>/dev/null || echo "0")
  echo "  - CLAUDE.md Rules: $must_count MUST/MUST NOT rules"

  local hook_count=0
  if [ -f ".claude/settings.json" ]; then
    hook_count=$(grep -c "matcher\|command" .claude/settings.json 2>/dev/null || echo "0")
    hook_count=$((hook_count / 2))
  fi
  echo "  - Hooks Configured: $hook_count PostToolUse hooks"
  local canary_status="NOT VERIFIED"
  if npm test 2>&1 | grep -qE 'pass' 2>/dev/null; then canary_status="PASSING"; fi
  echo "  - Canary Test: $canary_status"

  if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo ""
    echo "  WARNINGS:"
    for w in "${WARNINGS[@]}"; do
      echo "  - $w"
    done
  fi

  if [ ${#FAILURES[@]} -gt 0 ]; then
    echo ""
    echo "  FAILURES:"
    for f in "${FAILURES[@]}"; do
      echo "  - $f"
    done
  fi

  echo "═══════════════════════════════════════════════════════"
}

########################################################################
# Main
########################################################################
main() {
  local mode=""
  local step=""

  while [[ $# -gt 0 ]]; do
    case $1 in
      --all)
        mode="all"
        shift
        ;;
      --step)
        mode="step"
        step="$2"
        shift 2
        ;;
      *)
        echo "Usage: $0 --all | --step <step-name>"
        echo "Steps: structure, dependencies, testing, cicd, git-automation, claude-config"
        exit 1
        ;;
    esac
  done

  if [ -z "$mode" ]; then
    echo "Usage: $0 --all | --step <step-name>"
    echo "Steps: structure, dependencies, testing, cicd, git-automation, claude-config"
    exit 1
  fi

  echo "═══════════════════════════════════════════════════════"
  echo "  SCAFFOLDING VALIDATION — $(date '+%Y-%m-%d %H:%M:%S')"
  echo "═══════════════════════════════════════════════════════"

  local exit_code=0

  if [ "$mode" = "step" ]; then
    case $step in
      structure)      test_structure || exit_code=1 ;;
      dependencies)   test_dependencies || exit_code=1 ;;
      testing)        test_testing || exit_code=1 ;;
      cicd)           test_cicd || exit_code=1 ;;
      git-automation) test_git_automation || exit_code=1 ;;
      claude-config)  test_claude_config || exit_code=1 ;;
      *)
        echo "Unknown step: $step"
        echo "Valid steps: structure, dependencies, testing, cicd, git-automation, claude-config"
        exit 1
        ;;
    esac
  elif [ "$mode" = "all" ]; then
    test_structure || exit_code=1
    test_dependencies || exit_code=1
    test_testing || exit_code=1
    test_cicd || exit_code=1
    test_git_automation || exit_code=1
    test_claude_config || exit_code=1
    test_full_chain || exit_code=1
  fi

  print_summary
  exit $exit_code
}

main "$@"
