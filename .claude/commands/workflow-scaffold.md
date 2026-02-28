# Phase 4 — Project Scaffolding & Tooling (With Dev Server & Frontend Setup)

You are the lead project engineer. Your job is to set up the complete project infrastructure — directory structure, dependencies, test frameworks, dev server, frontend skeleton, CI/CD, git automation, and Claude agent configuration — so that Phase 5 (feature development) can begin producing **visible, browser-verifiable features from the very first batch**.

Every tool must be installed, every config must be valid, every automation script must run without errors, and **the dev server must serve a visible page**.

**CRITICAL**: This phase produces ZERO feature code. It produces only infrastructure, configuration, and tooling. If you find yourself writing application logic, STOP — that belongs in Phase 5.

**CRITICAL**: The dev server MUST be running and serving a page before this phase is complete. Phase 5 depends on being able to verify UI in a browser from Batch 0.

## Inputs (All Required — Do NOT proceed if any are missing)

- `docs/prd.md` — Product requirements (from Phase 2)
- `.specify/memory/constitution.md` — Project principles (from Phase 3)
- `.specify/specs/[NNN-feature-name]/spec.md` — Feature specification (from Phase 3)
- `.specify/specs/[NNN-feature-name]/plan.md` — Implementation plan with tech stack (from Phase 3)
- `.specify/specs/[NNN-feature-name]/data-model.md` — Entity definitions (from Phase 3)
- `.specify/specs/[NNN-feature-name]/tasks.md` — Task breakdown (from Phase 3)
- `CLAUDE.md` — If exists, contains project rules to preserve and extend

Read ALL of these before generating anything. The plan.md is your primary blueprint — it specifies the tech stack, project structure, dependencies, and testing framework.

---

## MASTER TASK — Six Stages

```
STAGE 1: Build validation tests for scaffolding (TDD for infrastructure)
STAGE 2: Generate scaffolding using agent teams with per-step gates
STAGE 3: Run full validation — every tool must actually execute
STAGE 4: Fix-and-revalidate loop
STAGE 5: Dev server smoke test — prove a page is visible in the browser
STAGE 6: Smoke test — prove the empty project builds, lints, and tests clean
```

---

## STAGE 1: Build the Scaffolding Validation Framework

Create `scripts/validate-scaffolding.sh` (bash) that validates the entire scaffolding setup. Unlike the spec-kit validator which parsed markdown, this validator **actually runs tools** to verify they work.

Support two modes:
```bash
bash scripts/validate-scaffolding.sh --step structure
bash scripts/validate-scaffolding.sh --step dependencies
bash scripts/validate-scaffolding.sh --step testing
bash scripts/validate-scaffolding.sh --step devserver
bash scripts/validate-scaffolding.sh --step cicd
bash scripts/validate-scaffolding.sh --step git-automation
bash scripts/validate-scaffolding.sh --step claude-config

# Validate everything
bash scripts/validate-scaffolding.sh --all
```

### Test Categories by Step

#### STEP 1 Tests: Project Structure
```
TEST-DIR01: Source directory exists and matches plan.md project type:
            - Single project: src/ at root
            - Web app: both backend and frontend source directories exist
            - Adapt to plan.md's specified structure
TEST-DIR02: Test directories exist:
            - tests/unit/
            - tests/integration/
            - tests/e2e/
            (or equivalent per plan.md structure)
TEST-DIR03: Scripts directory exists: scripts/
TEST-DIR04: CI/CD directory exists: .github/workflows/
TEST-DIR05: .specify/ directory intact from Phase 3
            (constitution.md, specs/, templates/ all still present)
TEST-DIR06: docs/ directory contains prd.md
TEST-DIR07: No source files exist in src/ yet
            (scaffolding only — feature code belongs in Phase 5)
TEST-DIR08: .gitignore exists and covers:
            node_modules/ (or equivalent), .env, dist/, coverage/,
            OS files (.DS_Store, Thumbs.db)
TEST-DIR09: README.md exists with at minimum:
            project name, setup instructions, and test run command
TEST-DIR10: Frontend directories exist:
            - src/components/ (or framework equivalent)
            - src/pages/ (or framework equivalent)
            - src/layouts/ (or framework equivalent)
            - src/styles/ (or framework equivalent)
```

#### STEP 2 Tests: Dependencies & Configuration
```
TEST-DEP01: Package manifest exists (package.json, requirements.txt,
            Cargo.toml, go.mod, etc. — based on plan.md language)
TEST-DEP02: Package manifest is valid JSON/TOML/etc. (parse without error)
TEST-DEP03: Every dependency listed in plan.md Tech Stack Summary
            appears in the package manifest
TEST-DEP04: Dependencies install successfully
            (run: npm install / pip install / cargo build --check / etc.)
            Exit code must be 0
TEST-DEP05: No dependency version conflicts
            (check for peer dependency warnings or resolution errors)
TEST-DEP06: Lock file generated (package-lock.json, poetry.lock, etc.)
TEST-DEP07: Language configuration file exists and is valid:
            - TypeScript: tsconfig.json parses without error
            - Python: pyproject.toml or setup.cfg valid
            - etc.
TEST-DEP08: Linter configuration exists and is valid:
            (run linter on an empty or minimal file — must not crash)
TEST-DEP09: Formatter configuration exists (if plan.md or constitution
            specifies one): prettier, black, etc.
TEST-DEP10: Environment variable template exists (.env.example or similar)
            listing all required env vars from plan.md without actual secrets
TEST-DEP11: If plan.md specifies a database:
            - Database client library is in dependencies
            - Schema migration tool is configured (if plan calls for one)
```

#### STEP 3 Tests: Test Framework
```
TEST-TST01: Test runner is installed and executable
            (run: npx vitest --version / npx jest --version /
             pytest --version / etc. — exit code 0)
TEST-TST02: Test configuration file exists and is valid:
            vitest.config.ts, jest.config.js, pytest.ini, etc.
TEST-TST03: Test runner executes successfully with zero tests
            (run the test command — it should exit 0 with "no tests found"
             or "0 tests passed", NOT crash with a config error)
TEST-TST04: Coverage is configured with thresholds matching constitution
            or plan.md targets (default 80% if not specified)
TEST-TST05: Coverage tool runs without error
            (run: test command with --coverage flag — must not crash)
TEST-TST06: A canary test file exists in tests/unit/ that:
            - Contains exactly 1 test
            - The test PASSES (e.g., "expect(true).toBe(true)")
            - Proves the test framework actually works end-to-end
TEST-TST07: Test runner finds and runs the canary test
            (run test command — must report 1 passed)
TEST-TST08: If plan.md specifies E2E testing framework:
            - E2E framework is installed (playwright, cypress, etc.)
            - E2E config file exists
            - E2E framework initializes without error
TEST-TST09: If plan.md specifies component testing:
            - Testing Library or equivalent is installed
            - Component test utils are importable
TEST-TST10: If constitution mandates TDD:
            - PostToolUse hook is configured to run tests on file edit
              (verify .claude/settings.json has the hook)
TEST-TST11: Package manifest "scripts" section includes at minimum:
            "test" (unit tests), "test:coverage" (with coverage),
            "lint" (linter run)
TEST-TST12: If plan.md specifies E2E: "test:e2e" script exists in manifest
```

#### STEP 4 Tests: Dev Server (NEW — webapp-critical)
```
TEST-DEV01: Dev server start command exists in package manifest scripts
            (e.g., "dev", "start", "serve")
TEST-DEV02: .claude/launch.json exists and is valid JSON
TEST-DEV03: .claude/launch.json contains a configuration with:
            - name (string)
            - runtimeExecutable (string, e.g., "npm")
            - runtimeArgs (array, e.g., ["run", "dev"])
            - port (number)
TEST-DEV04: Dev server starts without errors
            (run the dev command, wait for ready signal, check exit code)
TEST-DEV05: Dev server serves a page at localhost on the configured port
            (HTTP request returns 200)
TEST-DEV06: Browser entry point exists (index.html or framework equivalent)
TEST-DEV07: Entry point renders a visible page (not a blank white screen)
            - Contains at least a heading or text element
TEST-DEV08: scripts/visual-verify.sh exists and is executable
```

#### STEP 5 Tests: CI/CD Pipeline
```
TEST-CI01: At least one workflow file exists in .github/workflows/
TEST-CI02: Workflow YAML is valid (parse without error)
TEST-CI03: Workflow triggers on push and pull_request
TEST-CI04: Workflow installs dependencies (contains install step)
TEST-CI05: Workflow runs linter
TEST-CI06: Workflow runs unit tests
TEST-CI07: Workflow runs integration tests (or has a step for them)
TEST-CI08: If E2E tests exist: workflow installs browser deps and runs E2E tests
TEST-CI09: Workflow uses the correct language version from plan.md
TEST-CI10: Workflow does NOT contain hardcoded secrets
            (scan for strings that look like API keys, tokens, passwords)
TEST-CI11: If plan.md specifies coverage gates:
            workflow includes coverage threshold check
```

#### STEP 6 Tests: Git Automation Scripts
```
TEST-GIT01: scripts/new-feature.sh exists and is executable (chmod +x)
TEST-GIT02: scripts/new-feature.sh creates correct branch naming
TEST-GIT03: scripts/push-feature.sh exists and is executable
TEST-GIT04: scripts/push-feature.sh runs lint and test before pushing
            (grep for lint and test commands in the script)
TEST-GIT05: scripts/merge-feature.sh exists and is executable
TEST-GIT06: scripts/merge-feature.sh runs tests before merging
TEST-GIT07: All scripts use set -e (fail on first error)
TEST-GIT08: Branch naming convention in scripts matches constitution or plan.md
TEST-GIT09: Pre-commit hook exists from Phase 3 and still works
TEST-GIT10: If plan.md specifies a develop branch:
            scripts reference develop as the integration branch
```

#### STEP 7 Tests: Claude Agent Configuration
```
TEST-CL01: CLAUDE.md exists at project root
TEST-CL02: CLAUDE.md contains "Project Overview" section
TEST-CL03: CLAUDE.md contains "Tech Stack" section listing the same technologies as plan.md
TEST-CL04: CLAUDE.md contains "Architecture Rules" section with MUST and MUST NOT rules
TEST-CL05: CLAUDE.md "Architecture Rules" include all constitutional principles
TEST-CL06: CLAUDE.md contains "Testing Requirements" section that
            specifies: test command, coverage threshold, and when tests must be written
TEST-CL07: CLAUDE.md contains "Git Conventions" section matching branch naming in scripts
TEST-CL08: CLAUDE.md contains "Common Patterns" section with at least one code example
TEST-CL09: CLAUDE.md contains "Reference Documents" section with
            paths to: prd.md, spec.md, plan.md, tasks.md
            (all paths must be valid relative paths that exist)
TEST-CL10: CLAUDE.md uses imperative language for rules
            (MUST, MUST NOT — not "consider" or "try to")
TEST-CL11: .claude/settings.json exists and is valid JSON
TEST-CL12: .claude/settings.json contains PostToolUse hooks that
            run tests and linter on file edits
TEST-CL13: .claude/commands/ directory exists with spec-kit commands from Phase 3 still intact
TEST-CL14: If CLAUDE.md references any file paths: all referenced files actually exist
TEST-CL15: CLAUDE.md does not contain placeholder text ([TODO], [TBD], [FILL IN])
TEST-CL16: CLAUDE.md contains "Visual Verification" section with rules for
            browser-based UI verification during development
```

#### Full-Chain Tests (--all mode only)
```
TEST-FC01: All 7 step validations pass
TEST-FC02: The project builds/compiles with zero errors
TEST-FC03: Linter runs clean on the scaffolded project (zero violations)
TEST-FC04: Test suite runs and the canary test passes
TEST-FC05: Coverage report generates without error
TEST-FC06: No TODO, FIXME, or PLACEHOLDER markers in any config file
TEST-FC07: .specify/ artifacts from Phase 3 are untouched
            (diff check: constitution.md, spec.md, plan.md, tasks.md
             should not have been modified by scaffolding)
TEST-FC08: Git status is clean or all changes are staged
TEST-FC09: Dev server starts and serves a visible page
```

---

## STAGE 2: Generate Scaffolding

Use agent teams to parallelize the scaffolding work. Read plan.md to determine the exact tech stack, then generate all infrastructure.

### Step 1: Project Structure Agent
Create all directories per plan.md's Project Structure section. Include frontend directories (components, pages, layouts, styles).

**After:** `bash scripts/validate-scaffolding.sh --step structure`

### Step 2: Dependencies Agent
Create package manifest, install all dependencies from plan.md Tech Stack Summary, set up language config (tsconfig, etc.), linter config, formatter config, .env.example.

**After:** `bash scripts/validate-scaffolding.sh --step dependencies`

### Step 3: Test Framework Agent
Install and configure test runner, coverage tool, E2E framework, component testing library. Create canary test. Set up test scripts in package manifest.

**After:** `bash scripts/validate-scaffolding.sh --step testing`

### Step 4: Dev Server Agent (NEW)
Set up the development server:
1. Create the entry point file (index.html or framework-specific equivalent)
2. Create a minimal root component/page that renders a shell (heading + placeholder text)
3. Configure the dev server command in package manifest
4. Create `.claude/launch.json` for Claude Preview integration:
```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "dev-server",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 3000
    }
  ]
}
```
5. Create `scripts/visual-verify.sh`:
```bash
#!/bin/bash
set -e
echo "Starting visual verification..."
echo "Dev server should be running. Checking..."
# Check if dev server is responding
if curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT:-3000} | grep -q "200"; then
  echo "  Dev server responding at localhost:${PORT:-3000}"
else
  echo "  ERROR: Dev server not responding. Start it first."
  exit 1
fi
echo "Visual verification: manually inspect the page or use Claude Preview tools."
echo "  - preview_start to launch server"
echo "  - preview_screenshot to capture current state"
echo "  - preview_snapshot to get accessibility tree"
echo "  - preview_inspect to check specific elements"
```
6. Verify the dev server starts and serves the shell page

**After:** `bash scripts/validate-scaffolding.sh --step devserver`

### Step 5: CI/CD Agent
Create GitHub Actions workflow(s) per plan.md specifications.

**After:** `bash scripts/validate-scaffolding.sh --step cicd`

### Step 6: Git Automation Agent
Create branch management scripts (new-feature.sh, push-feature.sh, merge-feature.sh). Preserve pre-commit hooks from Phase 3.

**After:** `bash scripts/validate-scaffolding.sh --step git-automation`

### Step 7: Claude Config Agent
Generate/update CLAUDE.md with all project rules, patterns, and references. Generate/update .claude/settings.json with PostToolUse hooks. Include a "Visual Verification" section in CLAUDE.md:

```markdown
## Visual Verification
- MUST verify UI in browser after every batch that produces UI components
- MUST use `preview_start` to launch dev server for verification
- MUST use `preview_screenshot` and `preview_snapshot` to verify page renders correctly
- MUST NOT merge a batch with UI changes without visual verification
- Visual verification failures block the batch just like test failures
```

**After:** `bash scripts/validate-scaffolding.sh --step claude-config`

---

## STAGE 3: Run Full Validation

`bash scripts/validate-scaffolding.sh --all`

---

## STAGE 4: Fix-and-Revalidate Loop

If any tests fail, fix the issue and re-run. Max 5 iterations.

---

## STAGE 5: Dev Server Smoke Test

Start the dev server and verify a page is visible:
1. Run the dev server start command
2. Wait for it to be ready (check for the "ready" or "listening" message)
3. Make an HTTP request to localhost — confirm 200 response
4. If Claude Preview tools are available, use `preview_start` and `preview_screenshot` to capture the initial page
5. Verify the page contains at least one visible text element

**This is a blocking gate.** If the dev server doesn't serve a visible page, Phase 5 cannot begin.

---

## STAGE 6: Full Smoke Test

1. `npm run build` (or equivalent) — must exit 0
2. `npm run lint` — must exit 0 with zero violations
3. `npm test` — must exit 0 with canary test passing
4. `npm run test:coverage` — must exit 0, report coverage
5. Dev server starts and responds with HTTP 200
6. Git status is clean or all changes committed

---

## Completion

When all stages pass, print:

```
Phase 4 complete. Project scaffolding validated.

  Infrastructure Summary:
  - Language: [from plan.md]
  - Dependencies: [count installed]
  - Dev Dependencies: [count installed]
  - Test Framework: [name + version]
  - E2E Framework: [name + version, or N/A]
  - Component Testing: [name + version]
  - Linter: [name + version]
  - CI/CD: [workflow count] workflows
  - Git Scripts: [count] automation scripts
  - CLAUDE.md Rules: [count MUST + MUST NOT rules]
  - Hooks Configured: [count PostToolUse hooks]
  - Dev Server: RUNNING at localhost:[port]
  - Canary Test: PASSING
  - Visual Verification: READY

Ready for Phase 5 — Feature Development (/workflow-build)
```
