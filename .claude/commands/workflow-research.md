# Phase 1 — Research & Requirements Discovery

You are the lead research analyst. Your job is to explore the problem space before committing to any requirements. This phase produces research artifacts — not decisions.

## Inputs

- Read all materials in the `docs/` folder (client requirements, background docs, any existing research)
- Read `CLAUDE.md` if it exists for project context
- Ask the user for any additional context about the problem they're solving

## Process

### Step 1: Define the Problem Statement

Write 2-3 sentences describing the user need or business goal. Be specific:
- GOOD: "Users need to filter invoices by date range and export to CSV"
- BAD: "Users need better invoice management"

### Step 2: Identify Stakeholders and Constraints

List:
- Who will use this feature/product (primary and secondary users)
- What systems it must integrate with
- Hard constraints: budget, timeline, tech stack mandates, compliance requirements
- Platform targets: web, mobile, desktop, specific browsers

### Step 3: Survey Existing Solutions

Research comparable products, open-source libraries, or API services that address the same problem. For each, capture:
- Name and link
- What it does well
- What it does poorly or doesn't cover
- Relevance to our problem

### Step 4: Document Open Questions

Every assumption that hasn't been validated goes on this list. These become the first items to resolve in the PRD phase. Common open questions:
- Authentication method (OAuth, JWT, session-based?)
- Data ownership and privacy requirements
- Performance targets (response times, concurrent users)
- Offline capability requirements
- Accessibility compliance level (WCAG AA, AAA?)

### Step 5: Gather Domain Knowledge

Use web search and your training data to gather information about:
- The problem domain (industry standards, common patterns)
- Technical approaches others have used
- Potential pitfalls and edge cases

## Output

Create `docs/research-brief.md` containing:

```markdown
# Research Brief — [Project Name]

## Problem Statement
[2-3 specific sentences]

## Stakeholders
- Primary users: [who]
- Secondary users: [who]
- Systems: [integrations]

## Constraints
- [List all hard constraints]

## Competitive Landscape
| Solution | Strengths | Weaknesses | Relevance |
|----------|-----------|------------|-----------|
| [name]   | [what]    | [what]     | [how]     |

## Domain Research
[Key findings about the problem space]

## Open Questions
1. [Question — who needs to answer it]
2. [Question — who needs to answer it]
...

## Recommendations
[Initial thoughts on approach — these are suggestions, not commitments]
```

## Completion Criteria

- [ ] Problem statement is specific and measurable
- [ ] At least 3 stakeholder groups identified
- [ ] At least 2 constraints documented
- [ ] At least 3 existing solutions surveyed
- [ ] Open questions list has at least 5 items
- [ ] Research brief saved to `docs/research-brief.md`

Print: "Phase 1 complete. Research brief saved to docs/research-brief.md. Ready for Phase 2 — PRD Creation (`/workflow-prd`)."
