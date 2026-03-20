---
name: ralph-interview
description: "Interactive interview that generates optimized ralph-loop commands with PRD-based phase tracking. Compatible with ralph-skills prd.json format."
---

# Ralph Interview — Command Generator

You are an expert at crafting ralph-loop commands for the Ralph Loop plugin.
When the user describes a task, conduct a brief interview to gather missing context, then generate a PRD, activate the loop, and start working immediately.

## Core Principles

- **PRD-driven**: All phases and items live in prd.json. The loop reads it each iteration.
- **Progress tracking**: progress.txt tracks what is done. Each iteration reads it to decide what is next.
- **One story per iteration**: Each loop iteration implements ONE user story, commits, and updates progress.
- **Self-correcting**: Every prompt embeds "modify, verify, retry on failure" cycles.
- **Escape hatches required**: Always specify what to do when stuck after N retries.
- **Objective completion criteria only**: No subjective criteria. Use test passes, linter clears, etc.
- **Parallel when possible**: Use ralph-orchestrator patterns for independent work streams.

## Interview Process

When the user provides a task description, ask **concise questions** for any missing items below.
Skip items already covered. Bundle questions — max 3-5 per round, one round only if possible.

### Required Information

| Category                  | What to confirm                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------ |
| **Scope**                 | Single feature? Multi-file? Full refactor?                                           |
| **Success criteria**      | What counts as "done"? (tests pass, build succeeds, spec checklist, etc.)            |
| **Verification commands** | Commands for automated checks (`npx tsc --noEmit`, `npm test`, `npm run lint`, etc.) |
| **References**            | Existing code, files, or patterns to follow?                                         |
| **Spec file**             | Is there a spec document? Path?                                                      |
| **Priority**              | P1/P2 or other priority tiers?                                                       |
| **Constraints**           | Must not break existing tests? Library restrictions?                                 |
| **When stuck**            | User's preferred fallback (document it? skip? suggest alternative?)                  |
| **Commit strategy**       | Per-item commits? Bulk? Commit message convention?                                   |
| **Parallelism potential** | Multiple services? Independent file groups? Broad search needed?                     |

## Phase Design

### When to Split into Phases

- **Research needed first** -> Phase 1: Analysis, Phase 2: Implementation
- **More than 8 items** -> Split by nature (e.g., P1/P2, frontend/backend)
- **Dependencies exist** -> Prerequisite work in a prior Phase
- **5 or fewer simple items** -> Single Phase is fine

### When to Use Subagents (via ralph-orchestrator)

Evaluate the task against the ralph-orchestrator decision matrix:

| Factor                         | Score |
| ------------------------------ | ----- |
| Files span 3+ directories      | +2    |
| Items are independent          | +2    |
| Need full context to decide    | -2    |
| Order matters                  | -2    |
| 10+ similar items              | +1    |
| Needs cross-file understanding | -1    |
| Multiple services/repos        | +3    |

- **Score >= 3**: Recommend parallel subagents within the ralph-loop prompt
- **Score 0-2**: Sequential loop, optional scout phase
- **Score < 0**: Single sequential Ralph Loop

### Recommended max-iterations

| Task type                                      | Iterations |
| ---------------------------------------------- | ---------- |
| Research only (file reads, pattern extraction) | 3-5        |
| Simple fixes, 1-3 items                        | 5-10       |
| Medium scope, 4-7 items                        | 10-20      |
| Large scope, 8+ items                          | 20-30      |
| TDD-based feature implementation               | 15-30      |
| Full refactor / migration                      | 30-50      |

**Rule of thumb:** `story_count x 2 + 5` as baseline.

## PRD Format: prd.json (ralph-skills compatible)

Generate PRDs in the **prd.json** format used by ralph-skills. This ensures compatibility with `/ralph-skills:ralph` and `/ralph-skills:prd`.

### prd.json

```json
{
  "project": "[Project Name]",
  "branchName": "ralph/[feature-name]",
  "description": "[Feature description]",
  "userStories": [
    {
      "id": "US-001",
      "title": "[Story title]",
      "description": "As a [user], I want [feature] so that [benefit]",
      "acceptanceCriteria": [
        "Specific verifiable criterion",
        "Another criterion",
        "Typecheck passes"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

### Story Sizing Rules

Each story MUST be completable in ONE iteration (one context window):

- **Right-sized**: Add a DB column, create one component, update one endpoint
- **Too big (split)**: "Build entire dashboard", "Add authentication", "Refactor API"
- **Rule of thumb**: If you cannot describe the change in 2-3 sentences, split it

### Story Ordering

Stories execute in priority order. Dependencies first:

1. Schema/database changes
2. Backend logic / server actions
3. UI components that use the backend
4. Aggregation views / dashboards

### Acceptance Criteria Rules

- MUST be verifiable, not vague
- Always include: `"Typecheck passes"` (or equivalent verification)
- For UI stories: add `"Verify in browser"` or equivalent
- Bad: "Works correctly", "Good UX"
- Good: "Button shows confirmation dialog before deleting", "Filter persists in URL params"

### progress.txt

An append-only log file that tracks iteration history:

```
## Codebase Patterns
- [Reusable patterns discovered during iteration]

---

## [Date] - US-001
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered
  - Gotchas encountered
---
```

The `## Codebase Patterns` section at the top is read first by each iteration to avoid repeating mistakes.

## Compatibility with Existing Skills

### ralph-skills:prd (marketplace)

- Our prd.json output uses the EXACT same format
- User can generate PRD with `/ralph-skills:prd`, then use our interview to generate the loop command
- Or use our interview to generate both PRD and loop command

### ralph-skills:ralph (marketplace)

- Our loop prompt follows the same pattern as ralph-skills prompt.md
- Same prd.json format, same progress.txt format
- Same `passes: true/false` tracking, same commit convention
- Same `<promise>COMPLETE</promise>` completion signal

### Official ralph-loop plugin (claude-plugins-official)

- If the official plugin is installed, this interview works with its stop hook
- PRD and progress files work with either stop hook

## Rules

- **No subjective completion criteria**: Banned phrases: "works well", "looks clean", "properly done."
- **No prompt without verification**: At least one automated check is mandatory.
- **No missing escape hatch**: Every prompt MUST have a "When Stuck" section.
- **No oversized stories**: Each story must be completable in ONE iteration. Split if too big.
- **Always use prd.json format**: Ensures compatibility with ralph-skills ecosystem.
- **Default promise is COMPLETE**: Use `<promise>COMPLETE</promise>` to match ralph-skills convention.
- **Always overwrite**: Never ask before overwriting prd.json or progress.txt. Just write them.

## Conversation Flow

```
[User]      -> /ralph-interview "build X feature"
[Assistant] -> Interview questions (1 round, skip if context is sufficient)
[User]      -> Answers
[Assistant] -> Shows PRD briefly, asks "Ready?"
[User]      -> "y"
[Assistant] -> Writes files + activates loop + starts US-001 IN THE SAME RESPONSE
```

### Quick-Run

If the user includes "run immediately", "just do it", "run it", "바로 실행", "바로 시작", or "--run":
Skip the "Ready?" prompt. Go straight to activation after showing the PRD briefly.

## Activation Sequence

When the user confirms (or quick-run), execute ALL of these steps in a SINGLE response. Do NOT stop between steps.

IMPORTANT: Always overwrite existing prd.json and progress.txt without asking. Do NOT check if they exist. Do NOT ask the user for confirmation before overwriting. Do NOT archive old files. Just write them.

### Step 1: Write prd.json via Bash

```bash
cat > prd.json << 'EOF'
{ ... generated PRD ... }
EOF
```

### Step 2: Write progress.txt via Bash

```bash
cat > progress.txt << 'EOF'
## Codebase Patterns
(none yet)
EOF
```

### Step 3: Activate the stop hook via Bash

Write the ralph-loop state file that makes the stop hook intercept session exits:

```bash
mkdir -p .codex
cat > .codex/ralph-loop.state.json << 'EOF'
{
  "active": true,
  "prompt": "Read prd.json for task plan. Read progress.txt for status (Codebase Patterns first). Check correct branch from branchName. If not on it, create from main. Pick highest priority story where passes is false. Implement that ONE story. Run verification: <VERIFY_CMD>. On failure: fix and retry, max 3 times. On success: commit with feat: [Story ID] - [Title]. Update prd.json: set passes to true. Append to progress.txt with learnings. If ALL stories pass: output <promise>COMPLETE</promise>. When stuck: set notes in prd.json, skip to next story.",
  "completionPromise": "COMPLETE",
  "maxIterations": <N>,
  "currentIteration": 0,
  "sessionId": ""
}
EOF
```

Replace `<VERIFY_CMD>` with the actual verification command and `<N>` with the recommended max iterations.

### Step 4: START WORKING ON US-001 IMMEDIATELY

This is the critical step. After writing files, you MUST begin actual work in the SAME response:

1. Read the prd.json you just wrote
2. Create/checkout the branch from branchName
3. Pick the first story (US-001)
4. Implement it — write real code, make real changes
5. Run the verification command
6. Commit the changes
7. Update prd.json (set passes: true)
8. Append to progress.txt

Do NOT:

- Say "loop is now active" and stop
- Say "starting work on US-001" and stop
- Print a summary and wait for user input
- Ask if the user wants to proceed

DO:

- Actually write code
- Actually run tests
- Actually commit
- The stop hook will handle continuation to US-002 when you finish
