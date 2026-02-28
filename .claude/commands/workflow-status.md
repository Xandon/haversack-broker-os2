# Workflow Status Dashboard

You are the project status reporter. Read the project's artifacts and present a comprehensive status dashboard.

## Process

### 1. Detect Current Phase

Check which artifacts exist to determine how far along the project is:

| Artifact | Indicates |
|----------|-----------|
| `docs/research-brief.md` | Phase 1 complete |
| `docs/prd.md` + `scripts/validate-prd.js` | Phase 2 complete |
| `.specify/specs/*/spec.md` + `scripts/validate-speckit.js` | Phase 3 complete |
| `.claude/launch.json` + `scripts/validate-scaffolding.sh` | Phase 4 complete |
| `docs/progress.md` | Phase 5 in progress or complete |

### 2. Run Available Validators

Run whichever validators exist and capture their results:
- `node scripts/validate-prd.js` (if exists)
- `node scripts/validate-speckit.js --all` (if exists)
- `bash scripts/validate-scaffolding.sh --all` (if exists)

### 3. Read Progress Tracker

If `docs/progress.md` exists, read it and extract:
- Batch status (pending, in progress, merged)
- Test results per batch
- Visual verification status per batch
- Acceptance verification status per batch

### 4. Check Git State

- Current branch
- Uncommitted changes
- Recent commits on develop/main
- Open feature branches

### 5. Check Dev Server

If `.claude/launch.json` exists:
- Attempt to determine if the dev server is configured
- Report the configured port

### 6. Present Dashboard

```
================================================================
  PROJECT STATUS DASHBOARD
================================================================

  Project: [name from CLAUDE.md or prd.md]
  Current Phase: [1-5 or COMPLETE]
  Current Branch: [branch name]

  Phase Completion:
  ─────────────────────────────────────────
  [✓] Phase 1: Research          docs/research-brief.md
  [✓] Phase 2: PRD               docs/prd.md (validated)
  [✓] Phase 3: Spec-Kit          .specify/specs/ (validated)
  [✓] Phase 4: Scaffolding       Infrastructure ready
  [~] Phase 5: Build             3/7 batches complete
  [ ] Phase 6: Testing           (integrated into Phase 5)
  [ ] Phase 7: Git/Ship          Pending

  PRD Validation:    41/41  ALL PASS
  Spec Validation:   [X]/[Y] [STATUS]
  Scaffolding:       78/78  ALL PASS

  Implementation Progress:
  ─────────────────────────────────────────
  | Batch | Status | Tests | Visual | Acceptance |
  |-------|--------|-------|--------|------------|
  | 0-foundation | MERGED | PASS | PASS | N/A |
  | 1-login      | MERGED | PASS | PASS | PASS |
  | 2-dashboard  | MERGED | PASS | PASS | PASS |
  | 3-settings   | IN PROGRESS | -- | -- | -- |
  | 4-reports    | PENDING | -- | -- | -- |

  Tasks: [completed]/[total] ([percent]%)
  User Stories: [completed]/[total]
  Test Coverage: [percent]%

  Dev Server: Configured at localhost:[port]
  Open Branches: [list]
  Last Commit: [message] ([time ago])

  Next Action:
  ─────────────────────────────────────────
  [Recommendation based on current state]
================================================================
```

### Next Action Recommendations

Based on current state, recommend:
- If Phase 1 not done: "Run `/workflow-research` to begin research"
- If Phase 2 not done: "Run `/workflow-prd` to create PRD"
- If Phase 3 not done: "Run `/workflow-speckit` to break down specs"
- If Phase 4 not done: "Run `/workflow-scaffold` to set up infrastructure"
- If Phase 5 in progress: "Continue with batch [N]: [description]. Run `/workflow-build`"
- If all batches done: "All batches complete. Run final acceptance tests and prepare for merge to main."
- If validation failures: "Fix [X] validation failures before proceeding"
