#!/usr/bin/env bash
set -uo pipefail

# ═══════════════════════════════════════════════════════
#   SCAFFOLDING VALIDATION FRAMEWORK
#   Phase 4 Infrastructure Tests
# ═══════════════════════════════════════════════════════

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# Counters
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0
TOTAL_COUNT=0
FAILURES=()
WARNINGS=()

# Step counters (bash 3.x compatible)
SP_structure=0; ST_structure=0
SP_dependencies=0; ST_dependencies=0
SP_testing=0; ST_testing=0
SP_cicd=0; ST_cicd=0
SP_git=0; ST_git=0
SP_claude=0; ST_claude=0
SP_fc=0; ST_fc=0
RAN_FC=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

pass() {
  local test_id="$1"
  local desc="$2"
  PASS_COUNT=$((PASS_COUNT + 1))
  TOTAL_COUNT=$((TOTAL_COUNT + 1))
  printf "  ${GREEN}PASS${NC}  %-12s %s\n" "$test_id" "$desc"
}

fail() {
  local test_id="$1"
  local desc="$2"
  FAIL_COUNT=$((FAIL_COUNT + 1))
  TOTAL_COUNT=$((TOTAL_COUNT + 1))
  FAILURES+=("$test_id: $desc")
  printf "  ${RED}FAIL${NC}  %-12s %s\n" "$test_id" "$desc"
}

warn() {
  local msg="$1"
  WARN_COUNT=$((WARN_COUNT + 1))
  WARNINGS+=("$msg")
}

step_header() {
  local step="$1"
  local desc="$2"
  printf "\n${CYAN}${BOLD}── Step %s: %s ──${NC}\n" "$step" "$desc"
}

# ═══════════════════════════════════════════════════════
# STEP 1: Project Structure
# ═══════════════════════════════════════════════════════
validate_structure() {
  step_header "1" "Project Structure"
  local sp=0
  local st=0

  # TEST-DIR01: Web app structure
  st=$((st + 1))
  if [ -d "backend/src" ] && [ -d "frontend/src" ]; then
    pass "TEST-DIR01" "Web app source directories exist (backend/src/, frontend/src/)"
    sp=$((sp + 1))
  else
    fail "TEST-DIR01" "Web app source directories missing (need backend/src/ AND frontend/src/)"
  fi

  # TEST-DIR02: Test directories
  st=$((st + 1))
  if [ -d "tests/unit" ] && [ -d "tests/integration" ] && [ -d "tests/e2e" ]; then
    pass "TEST-DIR02" "Test directories exist (tests/unit/, tests/integration/, tests/e2e/)"
    sp=$((sp + 1))
  else
    fail "TEST-DIR02" "Test directories missing (need tests/unit/, tests/integration/, tests/e2e/)"
  fi

  # TEST-DIR03: Scripts directory
  st=$((st + 1))
  if [ -d "scripts" ]; then
    pass "TEST-DIR03" "Scripts directory exists"
    sp=$((sp + 1))
  else
    fail "TEST-DIR03" "scripts/ directory missing"
  fi

  # TEST-DIR04: CI/CD directory
  st=$((st + 1))
  if [ -d ".github/workflows" ]; then
    pass "TEST-DIR04" "CI/CD directory exists (.github/workflows/)"
    sp=$((sp + 1))
  else
    fail "TEST-DIR04" ".github/workflows/ directory missing"
  fi

  # TEST-DIR05: .specify/ intact
  st=$((st + 1))
  if [ -f ".specify/memory/constitution.md" ] && [ -d ".specify/specs" ] && [ -d ".specify/templates" ]; then
    pass "TEST-DIR05" ".specify/ directory intact (constitution.md, specs/, templates/)"
    sp=$((sp + 1))
  else
    fail "TEST-DIR05" ".specify/ directory incomplete"
  fi

  # TEST-DIR06: docs/prd.md
  st=$((st + 1))
  if [ -f "docs/prd.md" ]; then
    pass "TEST-DIR06" "docs/prd.md exists"
    sp=$((sp + 1))
  else
    fail "TEST-DIR06" "docs/prd.md missing"
  fi

  # TEST-DIR07: No source files yet
  st=$((st + 1))
  local src_files=""
  for dir in backend/src frontend/src worker/src packages/shared/src; do
    if [ -d "$dir" ]; then
      local found
      found=$(find "$dir" -maxdepth 4 -name "*.ts" -o -name "*.tsx" 2>/dev/null | head -5)
      src_files="${src_files}${found}"
    fi
  done
  if [ -z "$src_files" ]; then
    pass "TEST-DIR07" "No source files in src/ directories (scaffolding only)"
    sp=$((sp + 1))
  else
    fail "TEST-DIR07" "Source files found in src/ — scaffolding should not contain feature code"
  fi

  # TEST-DIR08: .gitignore
  st=$((st + 1))
  if [ -f ".gitignore" ]; then
    local missing_count=0
    grep -q "node_modules" .gitignore 2>/dev/null || missing_count=$((missing_count + 1))
    grep -q "\.env" .gitignore 2>/dev/null || missing_count=$((missing_count + 1))
    grep -q "dist" .gitignore 2>/dev/null || missing_count=$((missing_count + 1))
    grep -q "coverage" .gitignore 2>/dev/null || missing_count=$((missing_count + 1))
    grep -q "DS_Store" .gitignore 2>/dev/null || missing_count=$((missing_count + 1))
    if [ "$missing_count" -eq 0 ]; then
      pass "TEST-DIR08" ".gitignore exists with all required patterns"
      sp=$((sp + 1))
    else
      fail "TEST-DIR08" ".gitignore missing $missing_count required pattern(s)"
    fi
  else
    fail "TEST-DIR08" ".gitignore does not exist"
  fi

  # TEST-DIR09: README.md
  st=$((st + 1))
  if [ -f "README.md" ]; then
    local checks=0
    grep -qi "haversack" README.md 2>/dev/null && checks=$((checks + 1))
    grep -qi "setup\|install\|getting started" README.md 2>/dev/null && checks=$((checks + 1))
    grep -qi "test" README.md 2>/dev/null && checks=$((checks + 1))
    if [ "$checks" -ge 3 ]; then
      pass "TEST-DIR09" "README.md has project name, setup, and test info"
      sp=$((sp + 1))
    else
      fail "TEST-DIR09" "README.md missing required sections ($checks/3)"
    fi
  else
    fail "TEST-DIR09" "README.md does not exist"
  fi

  # TEST-DIR10: FileMaker (N/A)
  st=$((st + 1))
  pass "TEST-DIR10" "FileMaker WebViewer N/A (auto-pass)"
  sp=$((sp + 1))

  SP_structure=$sp; ST_structure=$st
}

# ═══════════════════════════════════════════════════════
# STEP 2: Dependencies & Configuration
# ═══════════════════════════════════════════════════════
validate_dependencies() {
  step_header "2" "Dependencies & Configuration"
  local sp=0
  local st=0

  # TEST-DEP01: Root package.json
  st=$((st + 1))
  if [ -f "package.json" ]; then
    pass "TEST-DEP01" "Root package.json exists"
    sp=$((sp + 1))
  else
    fail "TEST-DEP01" "Root package.json does not exist"
  fi

  # TEST-DEP02: Valid JSON
  st=$((st + 1))
  if [ -f "package.json" ] && node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))" 2>/dev/null; then
    pass "TEST-DEP02" "package.json is valid JSON"
    sp=$((sp + 1))
  else
    fail "TEST-DEP02" "package.json missing or invalid JSON"
  fi

  # TEST-DEP03: Key dependencies present
  st=$((st + 1))
  local all_deps=""
  for pkg in package.json backend/package.json frontend/package.json worker/package.json packages/shared/package.json; do
    if [ -f "$pkg" ]; then
      all_deps="$all_deps $(cat "$pkg" 2>/dev/null)"
    fi
  done
  local missing=0
  for dep in "fastify" "next" "react" "prisma" "zod" "vitest" "typescript" "eslint" "prettier" "tailwindcss" "bullmq" "pino"; do
    if ! echo "$all_deps" | grep -q "\"$dep\""; then
      missing=$((missing + 1))
    fi
  done
  if [ "$missing" -eq 0 ]; then
    pass "TEST-DEP03" "All plan.md tech stack dependencies found"
    sp=$((sp + 1))
  else
    fail "TEST-DEP03" "$missing dependencies missing from manifests"
  fi

  # TEST-DEP04: Dependencies installed
  st=$((st + 1))
  if [ -d "node_modules" ] && [ "$(ls node_modules 2>/dev/null | head -1)" != "" ]; then
    pass "TEST-DEP04" "Dependencies installed (node_modules exists)"
    sp=$((sp + 1))
  else
    fail "TEST-DEP04" "Dependencies not installed"
  fi

  # TEST-DEP05: No critical conflicts
  st=$((st + 1))
  local conflicts
  conflicts=$(npm ls --depth=0 2>&1 | grep -c "ERESOLVE\|ERR!" || true)
  conflicts=$(echo "$conflicts" | tr -d '[:space:]')
  conflicts=${conflicts:-0}
  if [ "$conflicts" -lt 3 ]; then
    pass "TEST-DEP05" "No critical dependency conflicts"
    sp=$((sp + 1))
  else
    fail "TEST-DEP05" "Dependency conflicts detected ($conflicts)"
  fi

  # TEST-DEP06: Lock file
  st=$((st + 1))
  if [ -f "package-lock.json" ]; then
    pass "TEST-DEP06" "package-lock.json exists"
    sp=$((sp + 1))
  else
    fail "TEST-DEP06" "package-lock.json missing"
  fi

  # TEST-DEP07: TypeScript config
  st=$((st + 1))
  if [ -f "tsconfig.base.json" ]; then
    if node -e "const c=require('fs').readFileSync('tsconfig.base.json','utf8').replace(/\/\/.*$/gm,'').replace(/\/\*[\s\S]*?\*\//g,'').replace(/,\s*([}\]])/g,'\$1'); JSON.parse(c);" 2>/dev/null; then
      pass "TEST-DEP07" "tsconfig.base.json exists and is valid"
      sp=$((sp + 1))
    else
      fail "TEST-DEP07" "tsconfig.base.json is invalid"
    fi
  else
    fail "TEST-DEP07" "tsconfig.base.json does not exist"
  fi

  # TEST-DEP08: Linter config
  st=$((st + 1))
  local eslint_found=false
  for f in .eslintrc.cjs .eslintrc.js .eslintrc.json eslint.config.js eslint.config.mjs; do
    [ -f "$f" ] && eslint_found=true && break
  done
  if $eslint_found; then
    if npx eslint --version 2>/dev/null | grep -q "[0-9]"; then
      pass "TEST-DEP08" "ESLint config exists and is executable"
      sp=$((sp + 1))
    else
      fail "TEST-DEP08" "ESLint config exists but not executable"
    fi
  else
    fail "TEST-DEP08" "ESLint configuration missing"
  fi

  # TEST-DEP09: Formatter config
  st=$((st + 1))
  local prettier_found=false
  for f in .prettierrc .prettierrc.json .prettierrc.js prettier.config.js; do
    [ -f "$f" ] && prettier_found=true && break
  done
  if $prettier_found; then
    pass "TEST-DEP09" "Prettier configuration exists"
    sp=$((sp + 1))
  else
    fail "TEST-DEP09" "Prettier configuration missing"
  fi

  # TEST-DEP10: .env.example
  st=$((st + 1))
  if [ -f ".env.example" ]; then
    pass "TEST-DEP10" ".env.example exists"
    sp=$((sp + 1))
  else
    fail "TEST-DEP10" ".env.example missing"
  fi

  # TEST-DEP11: Database client
  st=$((st + 1))
  if echo "$all_deps" | grep -q '"@prisma/client"\|"prisma"'; then
    pass "TEST-DEP11" "Prisma database client found"
    sp=$((sp + 1))
  else
    fail "TEST-DEP11" "Prisma not found in dependencies"
  fi

  # TEST-DEP12: FileMaker (N/A)
  st=$((st + 1))
  pass "TEST-DEP12" "FileMaker WebViewer N/A (auto-pass)"
  sp=$((sp + 1))

  SP_dependencies=$sp; ST_dependencies=$st
}

# ═══════════════════════════════════════════════════════
# STEP 3: Test Framework
# ═══════════════════════════════════════════════════════
validate_testing() {
  step_header "3" "Test Framework"
  local sp=0
  local st=0

  # TEST-TST01: Vitest installed
  st=$((st + 1))
  if npx vitest --version 2>/dev/null | grep -q "[0-9]"; then
    pass "TEST-TST01" "Vitest is installed and executable"
    sp=$((sp + 1))
  else
    fail "TEST-TST01" "Vitest not installed"
  fi

  # TEST-TST02: Vitest config exists
  st=$((st + 1))
  local vc=0
  [ -f "vitest.config.ts" ] && vc=$((vc + 1))
  [ -f "backend/vitest.config.ts" ] && vc=$((vc + 1))
  [ -f "frontend/vitest.config.ts" ] && vc=$((vc + 1))
  [ -f "worker/vitest.config.ts" ] && vc=$((vc + 1))
  if [ "$vc" -ge 1 ]; then
    pass "TEST-TST02" "Vitest config file(s) exist ($vc found)"
    sp=$((sp + 1))
  else
    fail "TEST-TST02" "No vitest.config.ts found"
  fi

  # TEST-TST03: Test runner executes without crash
  st=$((st + 1))
  local test_out
  test_out=$(npx vitest run --config vitest.config.ts 2>&1 || true)
  if echo "$test_out" | grep -qiE "passed|no test suite|Tests\s|test files"; then
    pass "TEST-TST03" "Test runner executes without config errors"
    sp=$((sp + 1))
  else
    fail "TEST-TST03" "Test runner fails to execute"
  fi

  # TEST-TST04: Coverage configured
  st=$((st + 1))
  local has_cov=false
  for cf in vitest.config.ts backend/vitest.config.ts frontend/vitest.config.ts; do
    if [ -f "$cf" ] && grep -q "coverage" "$cf" 2>/dev/null; then
      has_cov=true; break
    fi
  done
  if $has_cov; then
    pass "TEST-TST04" "Coverage configured in vitest config"
    sp=$((sp + 1))
  else
    fail "TEST-TST04" "Coverage not configured"
  fi

  # TEST-TST05: Coverage runs
  st=$((st + 1))
  local cov_out
  cov_out=$(npx vitest run --coverage --config vitest.config.ts 2>&1 || true)
  if echo "$cov_out" | grep -qiE "coverage|%|All files|Statements"; then
    pass "TEST-TST05" "Coverage tool runs without error"
    sp=$((sp + 1))
  else
    fail "TEST-TST05" "Coverage tool fails to run"
  fi

  # TEST-TST06: Canary test exists
  st=$((st + 1))
  if [ -f "tests/unit/canary.test.ts" ]; then
    pass "TEST-TST06" "Canary test file exists"
    sp=$((sp + 1))
  else
    fail "TEST-TST06" "Canary test missing (expected tests/unit/canary.test.ts)"
  fi

  # TEST-TST07: Canary test passes
  st=$((st + 1))
  local canary_out
  canary_out=$(npx vitest run tests/unit/canary.test.ts --config vitest.config.ts 2>&1 || true)
  if echo "$canary_out" | grep -qiE "1 passed|pass"; then
    pass "TEST-TST07" "Canary test passes"
    sp=$((sp + 1))
  else
    fail "TEST-TST07" "Canary test does not pass"
  fi

  # TEST-TST08: Playwright installed
  st=$((st + 1))
  if npx playwright --version 2>/dev/null | grep -q "[0-9]"; then
    pass "TEST-TST08" "Playwright E2E framework installed"
    sp=$((sp + 1))
  else
    fail "TEST-TST08" "Playwright not installed"
  fi

  # TEST-TST09: Testing Library
  st=$((st + 1))
  local all_deps=""
  for pkg in frontend/package.json package.json; do
    [ -f "$pkg" ] && all_deps="$all_deps $(cat "$pkg" 2>/dev/null)"
  done
  if echo "$all_deps" | grep -q "@testing-library"; then
    pass "TEST-TST09" "Testing Library found in dependencies"
    sp=$((sp + 1))
  else
    fail "TEST-TST09" "Testing Library not installed"
  fi

  # TEST-TST10: PostToolUse hook for TDD
  st=$((st + 1))
  if [ -f ".claude/settings.json" ] && grep -q "vitest\|test" .claude/settings.json 2>/dev/null; then
    pass "TEST-TST10" "PostToolUse hook configured to run tests"
    sp=$((sp + 1))
  else
    fail "TEST-TST10" "PostToolUse hook not configured for tests"
  fi

  # TEST-TST11: Scripts in package.json
  st=$((st + 1))
  if [ -f "package.json" ]; then
    local scripts
    scripts=$(node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log(JSON.stringify(p.scripts||{}))" 2>/dev/null || echo "{}")
    local checks=0
    echo "$scripts" | grep -q '"test"' && checks=$((checks + 1))
    echo "$scripts" | grep -q '"test:coverage"' && checks=$((checks + 1))
    echo "$scripts" | grep -q '"lint"' && checks=$((checks + 1))
    if [ "$checks" -ge 3 ]; then
      pass "TEST-TST11" "Package scripts: test, test:coverage, lint present"
      sp=$((sp + 1))
    else
      fail "TEST-TST11" "Package scripts missing ($checks/3)"
    fi
  else
    fail "TEST-TST11" "package.json does not exist"
  fi

  # TEST-TST12: E2E script
  st=$((st + 1))
  if [ -f "package.json" ]; then
    local scripts
    scripts=$(node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log(JSON.stringify(p.scripts||{}))" 2>/dev/null || echo "{}")
    if echo "$scripts" | grep -q '"test:e2e"'; then
      pass "TEST-TST12" "test:e2e script exists"
      sp=$((sp + 1))
    else
      fail "TEST-TST12" "test:e2e script missing"
    fi
  else
    fail "TEST-TST12" "package.json does not exist"
  fi

  SP_testing=$sp; ST_testing=$st
}

# ═══════════════════════════════════════════════════════
# STEP 4: CI/CD Pipeline
# ═══════════════════════════════════════════════════════
validate_cicd() {
  step_header "4" "CI/CD Pipeline"
  local sp=0
  local st=0

  # TEST-CI01: Workflow exists
  st=$((st + 1))
  local wf_count=0
  if [ -d ".github/workflows" ]; then
    wf_count=$(find .github/workflows -name "*.yml" -o -name "*.yaml" 2>/dev/null | wc -l | tr -d ' ')
  fi
  if [ "$wf_count" -gt 0 ]; then
    pass "TEST-CI01" "Workflow file(s) exist ($wf_count found)"
    sp=$((sp + 1))
  else
    fail "TEST-CI01" "No workflow files in .github/workflows/"
  fi

  # TEST-CI02: Valid YAML
  st=$((st + 1))
  local yaml_ok=true
  local checked=0
  for wf in .github/workflows/*.yml .github/workflows/*.yaml; do
    [ -f "$wf" ] || continue
    checked=$((checked + 1))
    if ! node -e "const y=require('fs').readFileSync('$wf','utf8'); JSON.stringify(y);" 2>/dev/null; then
      yaml_ok=false
    fi
    # Basic YAML check: must have 'name:' and 'on:'
    if ! grep -q "^name:" "$wf" 2>/dev/null; then
      yaml_ok=false
    fi
  done
  if $yaml_ok && [ "$checked" -gt 0 ]; then
    pass "TEST-CI02" "Workflow YAML files are valid"
    sp=$((sp + 1))
  elif [ "$checked" -eq 0 ]; then
    fail "TEST-CI02" "No workflow files to validate"
  else
    fail "TEST-CI02" "Workflow YAML parse error"
  fi

  # TEST-CI03: Triggers
  st=$((st + 1))
  local has_push=false has_pr=false
  for wf in .github/workflows/*.yml .github/workflows/*.yaml; do
    [ -f "$wf" ] || continue
    grep -q "push" "$wf" 2>/dev/null && has_push=true
    grep -q "pull_request" "$wf" 2>/dev/null && has_pr=true
  done
  if $has_push && $has_pr; then
    pass "TEST-CI03" "Triggers on push and pull_request"
    sp=$((sp + 1))
  else
    fail "TEST-CI03" "Missing triggers (push=$has_push, pr=$has_pr)"
  fi

  # TEST-CI04: Installs dependencies
  st=$((st + 1))
  local has_install=false
  for wf in .github/workflows/*.yml .github/workflows/*.yaml; do
    [ -f "$wf" ] || continue
    grep -qE "npm ci|npm install" "$wf" 2>/dev/null && has_install=true
  done
  if $has_install; then
    pass "TEST-CI04" "Workflow installs dependencies"
    sp=$((sp + 1))
  else
    fail "TEST-CI04" "Workflow does not install dependencies"
  fi

  # TEST-CI05: Runs linter
  st=$((st + 1))
  local has_lint=false
  for wf in .github/workflows/*.yml .github/workflows/*.yaml; do
    [ -f "$wf" ] || continue
    grep -qE "npm run lint|npx eslint|run lint" "$wf" 2>/dev/null && has_lint=true
  done
  if $has_lint; then
    pass "TEST-CI05" "Workflow runs linter"
    sp=$((sp + 1))
  else
    fail "TEST-CI05" "Workflow does not run linter"
  fi

  # TEST-CI06: Runs tests
  st=$((st + 1))
  local has_test=false
  for wf in .github/workflows/*.yml .github/workflows/*.yaml; do
    [ -f "$wf" ] || continue
    grep -qE "npm test|npm run test|npx vitest" "$wf" 2>/dev/null && has_test=true
  done
  if $has_test; then
    pass "TEST-CI06" "Workflow runs unit tests"
    sp=$((sp + 1))
  else
    fail "TEST-CI06" "Workflow does not run tests"
  fi

  # TEST-CI07: Integration tests
  st=$((st + 1))
  local has_int=false
  for wf in .github/workflows/*.yml .github/workflows/*.yaml; do
    [ -f "$wf" ] || continue
    grep -qE "test:integration|integration" "$wf" 2>/dev/null && has_int=true
  done
  if $has_int; then
    pass "TEST-CI07" "Workflow runs integration tests"
    sp=$((sp + 1))
  else
    fail "TEST-CI07" "Workflow missing integration tests"
  fi

  # TEST-CI08: E2E tests
  st=$((st + 1))
  local has_e2e=false
  for wf in .github/workflows/*.yml .github/workflows/*.yaml; do
    [ -f "$wf" ] || continue
    grep -qE "playwright|test:e2e|e2e" "$wf" 2>/dev/null && has_e2e=true
  done
  if $has_e2e; then
    pass "TEST-CI08" "Workflow includes E2E tests"
    sp=$((sp + 1))
  else
    fail "TEST-CI08" "Workflow missing E2E tests"
  fi

  # TEST-CI09: Node.js 20
  st=$((st + 1))
  local has_20=false
  for wf in .github/workflows/*.yml .github/workflows/*.yaml; do
    [ -f "$wf" ] || continue
    grep -qE "node-version.*20|'20'" "$wf" 2>/dev/null && has_20=true
  done
  if $has_20; then
    pass "TEST-CI09" "Workflow uses Node.js 20"
    sp=$((sp + 1))
  else
    fail "TEST-CI09" "Workflow does not specify Node.js 20"
  fi

  # TEST-CI10: No hardcoded secrets
  st=$((st + 1))
  local secrets_found=false
  for wf in .github/workflows/*.yml .github/workflows/*.yaml; do
    [ -f "$wf" ] || continue
    if grep -E "(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36})" "$wf" 2>/dev/null; then
      secrets_found=true
    fi
  done
  if ! $secrets_found; then
    pass "TEST-CI10" "No hardcoded secrets in workflows"
    sp=$((sp + 1))
  else
    fail "TEST-CI10" "Hardcoded secrets found in workflows"
  fi

  # TEST-CI11: Coverage step
  st=$((st + 1))
  local has_cov=false
  for wf in .github/workflows/*.yml .github/workflows/*.yaml; do
    [ -f "$wf" ] || continue
    grep -qE "coverage|test:coverage" "$wf" 2>/dev/null && has_cov=true
  done
  if $has_cov; then
    pass "TEST-CI11" "Workflow includes coverage step"
    sp=$((sp + 1))
  else
    fail "TEST-CI11" "Workflow missing coverage step"
  fi

  SP_cicd=$sp; ST_cicd=$st
}

# ═══════════════════════════════════════════════════════
# STEP 5: Git Automation Scripts
# ═══════════════════════════════════════════════════════
validate_git_automation() {
  step_header "5" "Git Automation Scripts"
  local sp=0
  local st=0

  # TEST-GIT01
  st=$((st + 1))
  if [ -f "scripts/new-feature.sh" ] && [ -x "scripts/new-feature.sh" ]; then
    pass "TEST-GIT01" "new-feature.sh exists and is executable"
    sp=$((sp + 1))
  else
    fail "TEST-GIT01" "new-feature.sh missing or not executable"
  fi

  # TEST-GIT02
  st=$((st + 1))
  if [ -f "scripts/new-feature.sh" ] && grep -qE 'feature/' scripts/new-feature.sh 2>/dev/null; then
    pass "TEST-GIT02" "new-feature.sh uses feature/ branch prefix"
    sp=$((sp + 1))
  else
    fail "TEST-GIT02" "new-feature.sh missing or no feature/ prefix"
  fi

  # TEST-GIT03
  st=$((st + 1))
  if [ -f "scripts/push-feature.sh" ] && [ -x "scripts/push-feature.sh" ]; then
    pass "TEST-GIT03" "push-feature.sh exists and is executable"
    sp=$((sp + 1))
  else
    fail "TEST-GIT03" "push-feature.sh missing or not executable"
  fi

  # TEST-GIT04
  st=$((st + 1))
  if [ -f "scripts/push-feature.sh" ]; then
    local hl=0 ht=0
    grep -qE "lint" scripts/push-feature.sh 2>/dev/null && hl=1
    grep -qE "test" scripts/push-feature.sh 2>/dev/null && ht=1
    if [ "$hl" -eq 1 ] && [ "$ht" -eq 1 ]; then
      pass "TEST-GIT04" "push-feature.sh runs lint and test"
      sp=$((sp + 1))
    else
      fail "TEST-GIT04" "push-feature.sh missing lint or test"
    fi
  else
    fail "TEST-GIT04" "push-feature.sh missing"
  fi

  # TEST-GIT05
  st=$((st + 1))
  if [ -f "scripts/merge-feature.sh" ] && [ -x "scripts/merge-feature.sh" ]; then
    pass "TEST-GIT05" "merge-feature.sh exists and is executable"
    sp=$((sp + 1))
  else
    fail "TEST-GIT05" "merge-feature.sh missing or not executable"
  fi

  # TEST-GIT06
  st=$((st + 1))
  if [ -f "scripts/merge-feature.sh" ] && grep -qE "test" scripts/merge-feature.sh 2>/dev/null; then
    pass "TEST-GIT06" "merge-feature.sh runs tests before merge"
    sp=$((sp + 1))
  else
    fail "TEST-GIT06" "merge-feature.sh missing tests"
  fi

  # TEST-GIT07: set -e in all scripts
  st=$((st + 1))
  local all_sete=true
  for s in scripts/new-feature.sh scripts/push-feature.sh scripts/merge-feature.sh; do
    if [ -f "$s" ] && ! grep -q "set -e" "$s" 2>/dev/null; then
      all_sete=false
    fi
  done
  if [ ! -f "scripts/new-feature.sh" ]; then all_sete=false; fi
  if $all_sete; then
    pass "TEST-GIT07" "All git scripts use set -e"
    sp=$((sp + 1))
  else
    fail "TEST-GIT07" "Not all scripts use set -e"
  fi

  # TEST-GIT08: Branch naming convention
  st=$((st + 1))
  if [ -f "scripts/new-feature.sh" ] && grep -qE 'feature/|fix/|chore/' scripts/new-feature.sh 2>/dev/null; then
    pass "TEST-GIT08" "Branch naming matches convention"
    sp=$((sp + 1))
  else
    fail "TEST-GIT08" "Branch naming convention mismatch"
  fi

  # TEST-GIT09: Pre-commit hook
  st=$((st + 1))
  if [ -f ".git/hooks/pre-commit" ] && [ -x ".git/hooks/pre-commit" ]; then
    pass "TEST-GIT09" "Pre-commit hook exists and is executable"
    sp=$((sp + 1))
  elif [ -f ".husky/pre-commit" ]; then
    pass "TEST-GIT09" "Pre-commit hook exists via Husky"
    sp=$((sp + 1))
  else
    fail "TEST-GIT09" "Pre-commit hook missing"
  fi

  # TEST-GIT10: Integration branch
  st=$((st + 1))
  local uses_main=true
  for s in scripts/new-feature.sh scripts/merge-feature.sh; do
    if [ -f "$s" ] && ! grep -q "main" "$s" 2>/dev/null; then
      uses_main=false
    fi
  done
  if [ ! -f "scripts/new-feature.sh" ]; then uses_main=false; fi
  if $uses_main; then
    pass "TEST-GIT10" "Scripts reference main as integration branch"
    sp=$((sp + 1))
  else
    fail "TEST-GIT10" "Scripts don't reference main"
  fi

  SP_git=$sp; ST_git=$st
}

# ═══════════════════════════════════════════════════════
# STEP 6: Claude Agent Configuration
# ═══════════════════════════════════════════════════════
validate_claude_config() {
  step_header "6" "Claude Agent Configuration"
  local sp=0
  local st=0

  # TEST-CL01
  st=$((st + 1))
  if [ -f "CLAUDE.md" ]; then
    pass "TEST-CL01" "CLAUDE.md exists"
    sp=$((sp + 1))
  else
    fail "TEST-CL01" "CLAUDE.md missing"
  fi

  # TEST-CL02
  st=$((st + 1))
  if grep -q "## Project Overview" CLAUDE.md 2>/dev/null; then
    pass "TEST-CL02" "Contains Project Overview section"
    sp=$((sp + 1))
  else
    fail "TEST-CL02" "Missing Project Overview section"
  fi

  # TEST-CL03
  st=$((st + 1))
  if grep -q "## Tech Stack" CLAUDE.md 2>/dev/null; then
    local kt=0
    grep -q "Next.js" CLAUDE.md && kt=$((kt + 1))
    grep -q "Fastify" CLAUDE.md && kt=$((kt + 1))
    grep -q "Prisma" CLAUDE.md && kt=$((kt + 1))
    grep -q "PostgreSQL" CLAUDE.md && kt=$((kt + 1))
    grep -q "Vitest" CLAUDE.md && kt=$((kt + 1))
    if [ "$kt" -ge 4 ]; then
      pass "TEST-CL03" "Tech Stack matches plan.md ($kt/5)"
      sp=$((sp + 1))
    else
      fail "TEST-CL03" "Tech Stack incomplete ($kt/5)"
    fi
  else
    fail "TEST-CL03" "Missing Tech Stack section"
  fi

  # TEST-CL04
  st=$((st + 1))
  if grep -q "## Architecture Rules" CLAUDE.md 2>/dev/null; then
    local mc
    mc=$(grep -c "MUST" CLAUDE.md 2>/dev/null || true)
    mc=$(echo "$mc" | tr -d '[:space:]')
    mc=${mc:-0}
    if [ "$mc" -ge 10 ]; then
      pass "TEST-CL04" "Architecture Rules with $mc MUST rules"
      sp=$((sp + 1))
    else
      fail "TEST-CL04" "Too few MUST rules ($mc)"
    fi
  else
    fail "TEST-CL04" "Missing Architecture Rules"
  fi

  # TEST-CL05
  st=$((st + 1))
  local ch=0
  grep -q "Next.js 14.*App Router" CLAUDE.md 2>/dev/null && ch=$((ch + 1))
  grep -q "Express MUST NOT" CLAUDE.md 2>/dev/null && ch=$((ch + 1))
  grep -q "TypeScript.*strict" CLAUDE.md 2>/dev/null && ch=$((ch + 1))
  grep -q "tenant_id" CLAUDE.md 2>/dev/null && ch=$((ch + 1))
  grep -q "Zod" CLAUDE.md 2>/dev/null && ch=$((ch + 1))
  if [ "$ch" -ge 4 ]; then
    pass "TEST-CL05" "Includes constitutional principles ($ch/5)"
    sp=$((sp + 1))
  else
    fail "TEST-CL05" "Missing constitutional principles ($ch/5)"
  fi

  # TEST-CL06
  st=$((st + 1))
  if grep -q "## Testing Requirements" CLAUDE.md 2>/dev/null; then
    local tr=0
    grep -q "npm test\|vitest" CLAUDE.md 2>/dev/null && tr=$((tr + 1))
    grep -q "80%" CLAUDE.md 2>/dev/null && tr=$((tr + 1))
    grep -q "commit" CLAUDE.md 2>/dev/null && tr=$((tr + 1))
    if [ "$tr" -ge 2 ]; then
      pass "TEST-CL06" "Testing Requirements complete ($tr/3)"
      sp=$((sp + 1))
    else
      fail "TEST-CL06" "Testing Requirements incomplete ($tr/3)"
    fi
  else
    fail "TEST-CL06" "Missing Testing Requirements"
  fi

  # TEST-CL07
  st=$((st + 1))
  if grep -q "## Git Conventions" CLAUDE.md 2>/dev/null && grep -q "feature/" CLAUDE.md 2>/dev/null; then
    pass "TEST-CL07" "Git Conventions with feature/ naming"
    sp=$((sp + 1))
  else
    fail "TEST-CL07" "Missing or incomplete Git Conventions"
  fi

  # TEST-CL08
  st=$((st + 1))
  if grep -q "## Common Patterns" CLAUDE.md 2>/dev/null; then
    local cbc
    cbc=$(grep -c '```' CLAUDE.md 2>/dev/null || true)
    cbc=$(echo "$cbc" | tr -d '[:space:]')
    cbc=${cbc:-0}
    if [ "$cbc" -ge 2 ]; then
      pass "TEST-CL08" "Common Patterns with code examples ($((cbc / 2)) blocks)"
      sp=$((sp + 1))
    else
      fail "TEST-CL08" "Common Patterns missing code examples"
    fi
  else
    fail "TEST-CL08" "Missing Common Patterns"
  fi

  # TEST-CL09
  st=$((st + 1))
  if grep -q "## Reference Documents" CLAUDE.md 2>/dev/null; then
    local ref_ok=true
    local refs
    refs=$(sed -n '/## Reference Documents/,/^##/p' CLAUDE.md 2>/dev/null | grep -oE '[a-zA-Z0-9._/-]+\.md' || true)
    for ref in $refs; do
      if [ ! -f "$ref" ]; then
        ref_ok=false
        warn "Dead link: $ref"
      fi
    done
    if $ref_ok; then
      pass "TEST-CL09" "Reference Documents — all paths valid"
      sp=$((sp + 1))
    else
      fail "TEST-CL09" "Dead links in Reference Documents"
    fi
  else
    fail "TEST-CL09" "Missing Reference Documents"
  fi

  # TEST-CL10
  st=$((st + 1))
  local mc
  mc=$(grep -c "MUST" CLAUDE.md 2>/dev/null || true)
  mc=$(echo "$mc" | tr -d '[:space:]')
  mc=${mc:-0}
  local sc
  sc=$(grep -cE "consider |try to |should |might " CLAUDE.md 2>/dev/null || true)
  sc=$(echo "$sc" | tr -d '[:space:]')
  sc=${sc:-0}
  if [ "$mc" -ge 10 ] && [ "$sc" -lt 5 ]; then
    pass "TEST-CL10" "Imperative language ($mc MUST, $sc soft)"
    sp=$((sp + 1))
  else
    fail "TEST-CL10" "Language issue (MUST: $mc, soft: $sc)"
  fi

  # TEST-CL11
  st=$((st + 1))
  if [ -f ".claude/settings.json" ] && node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8'))" 2>/dev/null; then
    pass "TEST-CL11" ".claude/settings.json valid JSON"
    sp=$((sp + 1))
  else
    fail "TEST-CL11" ".claude/settings.json missing or invalid"
  fi

  # TEST-CL12
  st=$((st + 1))
  if [ -f ".claude/settings.json" ]; then
    local ht=0 hl=0
    grep -q "vitest\|npm test" .claude/settings.json 2>/dev/null && ht=1
    grep -q "eslint\|lint" .claude/settings.json 2>/dev/null && hl=1
    if [ "$ht" -eq 1 ] && [ "$hl" -eq 1 ]; then
      pass "TEST-CL12" "PostToolUse hooks: test + lint"
      sp=$((sp + 1))
    else
      fail "TEST-CL12" "PostToolUse hooks incomplete (test=$ht, lint=$hl)"
    fi
  else
    fail "TEST-CL12" ".claude/settings.json missing"
  fi

  # TEST-CL13
  st=$((st + 1))
  if [ -d ".claude/commands" ]; then
    local cc
    cc=$(ls .claude/commands/*.md 2>/dev/null | wc -l | tr -d ' ')
    if [ "$cc" -ge 5 ]; then
      pass "TEST-CL13" ".claude/commands/ intact ($cc commands)"
      sp=$((sp + 1))
    else
      fail "TEST-CL13" ".claude/commands/ too few ($cc)"
    fi
  else
    fail "TEST-CL13" ".claude/commands/ missing"
  fi

  # TEST-CL14: All referenced paths exist
  st=$((st + 1))
  local dead=0
  # Check specific known references
  for ref in "docs/prd.md" ".specify/specs/001-haversack-unified-platform/spec.md" ".specify/specs/001-haversack-unified-platform/plan.md" ".specify/specs/001-haversack-unified-platform/tasks.md" ".specify/memory/constitution.md"; do
    if grep -q "$ref" CLAUDE.md 2>/dev/null && [ ! -f "$ref" ]; then
      dead=$((dead + 1))
      warn "Dead link: $ref"
    fi
  done
  if [ "$dead" -eq 0 ]; then
    pass "TEST-CL14" "All referenced file paths valid"
    sp=$((sp + 1))
  else
    fail "TEST-CL14" "$dead dead links found"
  fi

  # TEST-CL15: No placeholders
  st=$((st + 1))
  local pc
  pc=$(grep -ciE '\[TODO\]|\[TBD\]|\[FILL IN\]|\[PLACEHOLDER\]' CLAUDE.md 2>/dev/null || true)
  pc=$(echo "$pc" | tr -d '[:space:]')
  pc=${pc:-0}
  if [ "$pc" -eq 0 ]; then
    pass "TEST-CL15" "No placeholder text"
    sp=$((sp + 1))
  else
    fail "TEST-CL15" "$pc placeholders found"
  fi

  SP_claude=$sp; ST_claude=$st
}

# ═══════════════════════════════════════════════════════
# FULL-CHAIN TESTS
# ═══════════════════════════════════════════════════════
validate_full_chain() {
  step_header "FC" "Full-Chain Validation"
  RAN_FC=true
  local sp=0
  local st=0

  # TEST-FC01: All steps pass
  st=$((st + 1))
  local all_ok=true
  [ "$SP_structure" -ne "$ST_structure" ] && all_ok=false
  [ "$SP_dependencies" -ne "$ST_dependencies" ] && all_ok=false
  [ "$SP_testing" -ne "$ST_testing" ] && all_ok=false
  [ "$SP_cicd" -ne "$ST_cicd" ] && all_ok=false
  [ "$SP_git" -ne "$ST_git" ] && all_ok=false
  [ "$SP_claude" -ne "$ST_claude" ] && all_ok=false
  if $all_ok; then
    pass "TEST-FC01" "All 6 step validations pass"
    sp=$((sp + 1))
  else
    fail "TEST-FC01" "Not all step validations pass"
  fi

  # TEST-FC02: Build
  st=$((st + 1))
  local build_out
  local build_exit=0
  build_out=$(npm run build 2>&1) || build_exit=$?
  if [ "$build_exit" -ne 0 ]; then
    fail "TEST-FC02" "Build has TypeScript errors (exit code $build_exit)"
  else
    pass "TEST-FC02" "Build passes"
    sp=$((sp + 1))
  fi

  # TEST-FC03: Lint clean
  st=$((st + 1))
  local lint_out
  lint_out=$(npm run lint 2>&1 || true)
  if echo "$lint_out" | grep -qE "[0-9]+ error"; then
    fail "TEST-FC03" "Linter reports errors"
  else
    pass "TEST-FC03" "Linter runs clean"
    sp=$((sp + 1))
  fi

  # TEST-FC04: Canary test
  st=$((st + 1))
  local test_out
  test_out=$(npm test 2>&1 || true)
  if echo "$test_out" | grep -qiE "passed|pass"; then
    pass "TEST-FC04" "Canary test passes"
    sp=$((sp + 1))
  else
    fail "TEST-FC04" "Canary test fails"
  fi

  # TEST-FC05: Coverage
  st=$((st + 1))
  local cov_out
  cov_out=$(npm run test:coverage 2>&1 || true)
  if echo "$cov_out" | grep -qiE "coverage|%|All files"; then
    pass "TEST-FC05" "Coverage report generates"
    sp=$((sp + 1))
  else
    fail "TEST-FC05" "Coverage report fails"
  fi

  # TEST-FC06: No stale markers
  st=$((st + 1))
  local stale=0
  for cf in package.json tsconfig.base.json .prettierrc turbo.json; do
    if [ -f "$cf" ]; then
      local m
      m=$(grep -ciE 'TODO|FIXME|PLACEHOLDER' "$cf" 2>/dev/null || true)
      m=$(echo "$m" | tr -d '[:space:]')
      m=${m:-0}
      stale=$((stale + m))
    fi
  done
  for cf in .github/workflows/*.yml; do
    if [ -f "$cf" ]; then
      local m
      m=$(grep -ciE 'TODO|FIXME|PLACEHOLDER' "$cf" 2>/dev/null || true)
      m=$(echo "$m" | tr -d '[:space:]')
      m=${m:-0}
      stale=$((stale + m))
    fi
  done
  if [ "$stale" -eq 0 ]; then
    pass "TEST-FC06" "No stale markers in config files"
    sp=$((sp + 1))
  else
    fail "TEST-FC06" "$stale stale markers found"
  fi

  # TEST-FC07: .specify/ untouched
  st=$((st + 1))
  local spec_diff
  spec_diff=$(git diff --name-only -- .specify/ 2>/dev/null | wc -l | tr -d ' ')
  if [ "$spec_diff" -eq 0 ]; then
    pass "TEST-FC07" ".specify/ artifacts untouched"
    sp=$((sp + 1))
  else
    fail "TEST-FC07" ".specify/ modified ($spec_diff files)"
  fi

  # TEST-FC08: Git status
  st=$((st + 1))
  local untracked
  untracked=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')
  if [ "$untracked" -lt 100 ]; then
    pass "TEST-FC08" "Git status acceptable ($untracked untracked)"
    sp=$((sp + 1))
  else
    fail "TEST-FC08" "Too many untracked files ($untracked)"
  fi

  SP_fc=$sp; ST_fc=$st
}

# ═══════════════════════════════════════════════════════
# REPORT
# ═══════════════════════════════════════════════════════
print_report() {
  local tp=0
  local tt=0

  printf "\n"
  printf "${BOLD}═══════════════════════════════════════════════════════${NC}\n"
  printf "${BOLD}  SCAFFOLDING VALIDATION REPORT${NC}\n"
  printf "${BOLD}═══════════════════════════════════════════════════════${NC}\n"

  # Print each step
  print_step() {
    local label="$1" s_pass="$2" s_total="$3"
    tp=$((tp + s_pass))
    tt=$((tt + s_total))
    if [ "$s_pass" -eq "$s_total" ] && [ "$s_total" -gt 0 ]; then
      printf "  %-28s %2d/%-2d  ${GREEN}PASS${NC}\n" "$label:" "$s_pass" "$s_total"
    else
      printf "  %-28s %2d/%-2d  ${RED}FAIL${NC}\n" "$label:" "$s_pass" "$s_total"
    fi
  }

  [ "$ST_structure" -gt 0 ] && print_step "Step 1 — Structure" "$SP_structure" "$ST_structure"
  [ "$ST_dependencies" -gt 0 ] && print_step "Step 2 — Dependencies" "$SP_dependencies" "$ST_dependencies"
  [ "$ST_testing" -gt 0 ] && print_step "Step 3 — Test Framework" "$SP_testing" "$ST_testing"
  [ "$ST_cicd" -gt 0 ] && print_step "Step 4 — CI/CD" "$SP_cicd" "$ST_cicd"
  [ "$ST_git" -gt 0 ] && print_step "Step 5 — Git Automation" "$SP_git" "$ST_git"
  [ "$ST_claude" -gt 0 ] && print_step "Step 6 — Claude Config" "$SP_claude" "$ST_claude"
  if $RAN_FC; then
    print_step "Full-Chain" "$SP_fc" "$ST_fc"
  fi

  printf "${BOLD}═══════════════════════════════════════════════════════${NC}\n"
  if [ "$tp" -eq "$tt" ] && [ "$tt" -gt 0 ]; then
    printf "  TOTAL:                       %2d/%-2d  ${GREEN}ALL PASS${NC}\n" "$tp" "$tt"
  else
    printf "  TOTAL:                       %2d/%-2d  ${RED}%d FAILURES${NC}\n" "$tp" "$tt" "$((tt - tp))"
  fi
  printf "${BOLD}═══════════════════════════════════════════════════════${NC}\n"

  # Summary
  printf "\n  ${BOLD}Infrastructure Summary:${NC}\n"
  printf "  - Language: TypeScript 5.4+ / Node.js 20 LTS\n"

  if [ -f "package.json" ]; then
    local dc
    dc=$(node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log(Object.keys(p.dependencies||{}).length)" 2>/dev/null || echo "0")
    local ddc
    ddc=$(node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log(Object.keys(p.devDependencies||{}).length)" 2>/dev/null || echo "0")
    printf "  - Dependencies: %s installed\n" "$dc"
    printf "  - Dev Dependencies: %s installed\n" "$ddc"
  fi

  printf "  - Test Framework: Vitest %s\n" "$(npx vitest --version 2>/dev/null || echo 'N/A')"
  printf "  - Linter: ESLint %s\n" "$(npx eslint --version 2>/dev/null || echo 'N/A')"
  printf "  - E2E Framework: Playwright %s\n" "$(npx playwright --version 2>/dev/null || echo 'N/A')"

  local wfc=0
  [ -d ".github/workflows" ] && wfc=$(find .github/workflows -name "*.yml" -o -name "*.yaml" 2>/dev/null | wc -l | tr -d ' ')
  printf "  - CI/CD: %s workflow(s)\n" "$wfc"

  local gsc=0
  gsc=$(ls scripts/*.sh 2>/dev/null | wc -l | tr -d ' ')
  printf "  - Git Scripts: %s automation scripts\n" "$gsc"

  local mrc
  mrc=$(grep -c "MUST" CLAUDE.md 2>/dev/null || echo "0")
  mrc=$(echo "$mrc" | tr -d '[:space:]')
  printf "  - CLAUDE.md Rules: %s MUST/MUST NOT rules\n" "$mrc"

  local hkc=0
  if [ -f ".claude/settings.json" ]; then
    hkc=$(grep -c '"command"' .claude/settings.json 2>/dev/null || echo "0")
    hkc=$(echo "$hkc" | tr -d '[:space:]')
  fi
  printf "  - Hooks Configured: %s hook entries\n" "$hkc"

  local cs="NOT FOUND"
  [ -f "tests/unit/canary.test.ts" ] && cs="PRESENT"
  printf "  - Canary Test: %s\n" "$cs"

  if [ ${#WARNINGS[@]} -gt 0 ]; then
    printf "\n  ${YELLOW}WARNINGS:${NC}\n"
    for w in "${WARNINGS[@]}"; do
      printf "  - %s\n" "$w"
    done
  fi

  if [ ${#FAILURES[@]} -gt 0 ]; then
    printf "\n  ${RED}FAILURES:${NC}\n"
    for f in "${FAILURES[@]}"; do
      printf "  - %s\n" "$f"
    done
  fi

  printf "${BOLD}═══════════════════════════════════════════════════════${NC}\n"

  if [ "$tp" -ne "$tt" ]; then
    exit 1
  fi
  exit 0
}

# ═══════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════
usage() {
  echo "Usage: bash scripts/validate-scaffolding.sh [--step <step>|--all]"
  echo ""
  echo "Steps: structure, dependencies, testing, cicd, git-automation, claude-config"
  echo ""
  echo "Options:"
  echo "  --all            Run all validations including full-chain"
  echo "  --step <step>    Run a single step validation"
  exit 1
}

if [ $# -eq 0 ]; then
  usage
fi

case "$1" in
  --step)
    [ -z "${2:-}" ] && usage
    case "$2" in
      structure)       validate_structure ;;
      dependencies)    validate_dependencies ;;
      testing)         validate_testing ;;
      cicd)            validate_cicd ;;
      git-automation)  validate_git_automation ;;
      claude-config)   validate_claude_config ;;
      *)               echo "Unknown step: $2"; usage ;;
    esac
    ;;
  --all)
    validate_structure
    validate_dependencies
    validate_testing
    validate_cicd
    validate_git_automation
    validate_claude_config
    validate_full_chain
    ;;
  *)
    usage
    ;;
esac

print_report
