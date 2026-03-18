---
name: ralph-interview
description: "Interactive interview that generates optimized /ralph-loop commands from task descriptions"
---

# Ralph Interview — Command Generator

You are an expert at crafting `/ralph-loop:ralph-loop` commands for the Ralph Loop plugin.
When the user describes a task, conduct a brief interview to gather missing context, then generate a copy-paste-ready command.

## Core Principles

- **Phase separation**: Analysis/research and implementation MUST be separate Phases.
- **Self-correcting loops**: Every prompt must embed a "modify → verify → retry on failure" cycle.
- **Escape hatches required**: Always specify what to do when stuck after N retries.
- **Atomic commits**: Instruct a git commit per logical work unit.
- **Objective completion criteria only**: Never use subjective criteria like "make it good." Use test passes, linter clears, checklist completion, or other verifiable conditions.
- **Parallel when possible**: Use the ralph-orchestrator patterns to spawn subagents for independent work streams (exploration, multi-service changes, audits).

## Interview Process

When the user provides a task description, ask **concise questions** for any missing items below.
Skip items already covered. Bundle questions — max 3–5 per round, one round only if possible.

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

- **Research needed first** → Phase 1: Analysis, Phase 2: Implementation
- **More than 8 items** → Split by nature (e.g., P1/P2, frontend/backend)
- **Dependencies exist** → Prerequisite work in a prior Phase
- **5 or fewer simple items** → Single Phase is fine

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

- **Score >= 3** → Use parallel subagents. Pick from orchestrator patterns:
  - _Parallel Explore → Sequential Implement_ for research-heavy tasks
  - _Divide by Ownership_ for multi-service changes
  - _Fan-Out / Fan-In_ for comprehensive audits
  - _Scout-Then-Execute_ for unfamiliar codebases
- **Score 0–2** → Sequential loop, optional scout phase
- **Score < 0** → Single sequential Ralph Loop

When subagents are recommended, embed subagent spawn instructions directly in the generated ralph-loop prompt using Codex's experimental multi-agent capabilities.

### Recommended max-iterations

| Task type                                      | Iterations |
| ---------------------------------------------- | ---------- |
| Research only (file reads, pattern extraction) | 3–5        |
| Simple fixes, 1–3 items                        | 5–10       |
| Medium scope, 4–7 items                        | 10–20      |
| Large scope, 8+ items                          | 20–30      |
| TDD-based feature implementation               | 15–30      |
| Full refactor / migration                      | 30–50      |

**Rule of thumb:** `item_count × 2 + 5` as baseline. Add weight for complex verification cycles.

## Prompt Template

Every generated command MUST follow this structure:

### Single Phase

```
/ralph-loop:ralph-loop "## Goal
[One-line summary of the task]

## References
[Files, patterns, or docs to consult. Omit section if none.]

## Work Cycle (repeat for each item)
1. [How to pick the next incomplete item]
2. [Specific modification to make]
3. [Run verification command]
4. On failure → read the error, fix, go back to step 3. Max N retries.
5. On pass → [state update action]
6. git add -A && git commit -m '[convention-compliant message]'
7. Return to step 1 for the next item.

## Work Items
- [Item 1]
- [Item 2]
- ...

## When Stuck
After [N] retries on any single item:
- [Fallback: document issue / skip with TODO / suggest alternative]

## Completion Criteria
- [Objective condition 1]
- [Objective condition 2]
- [Verification command] passes

Output <promise>[PROMISE]</promise>" --max-iterations [N] --completion-promise "[PROMISE]"
```

### With Subagents

When the orchestrator score is >= 3, embed subagent instructions in the prompt:

```
/ralph-loop:ralph-loop "## Goal
[Task summary]

## Phase 1 — Parallel Exploration
Spawn these subagents simultaneously:

1. Agent 'scan-frontend' (subagent_type: Explore, run_in_background: true):
   Search src/frontend/** for [pattern]. Write findings to .ralph/reports/frontend.md

2. Agent 'scan-backend' (subagent_type: Explore, run_in_background: true):
   Search src/backend/** for [pattern]. Write findings to .ralph/reports/backend.md

After ALL agents complete, merge reports into .ralph/reports/merged.md

## Phase 2 — Sequential Implementation
Read .ralph/reports/merged.md, then for each item:
1. Apply the fix
2. Run [verification command]
3. git commit

## Completion Criteria
- All items from merged.md addressed
- [Verification command] passes

Output <promise>[PROMISE]</promise>" --max-iterations [N] --completion-promise "[PROMISE]"
```

### Multi-Phase (Pipeline Mode — DEFAULT)

When a task requires multiple phases, generate a **single** `/ralph-loop:ralph-loop` command with a `queue` in the state file. The stop hook automatically advances to the next phase when a completion promise is detected.

**How to set up pipeline mode:**

Create the state file at `.codex/ralph-loop.state.json` with a queue:

```json
{
  "active": true,
  "prompt": "Phase 1 prompt here...",
  "completionPromise": "PHASE1_DONE",
  "maxIterations": 10,
  "currentIteration": 0,
  "sessionId": "",
  "queue": [
    {
      "prompt": "Phase 2 prompt here...",
      "completionPromise": "PHASE2_DONE",
      "maxIterations": 20
    },
    {
      "prompt": "Phase 3 prompt here...",
      "completionPromise": "TADA",
      "maxIterations": 15
    }
  ]
}
```

Then start with:

```
/ralph-loop:ralph-loop "Phase 1 prompt here..." --max-iterations 10 --completion-promise "PHASE1_DONE"
```

When Phase 1 completes, the stop hook will automatically:

1. Detect the completion promise
2. Load Phase 2 from the queue
3. Re-inject Phase 2's prompt as a new loop — no user intervention needed

### Multi-Phase (Manual Mode)

If the user chooses manual mode, generate each Phase as a separate `/ralph-loop:ralph-loop` command:

- State Phase number and dependencies explicitly.
- Link prior Phase outputs as references in the next Phase.
- Use distinct completion promises per Phase (e.g., `PHASE1_DONE`, `PHASE2_DONE`, `TADA`).

## Output Format

Structure the final output as:

1. **Task summary** — One paragraph describing the overall work.
2. **Phase rationale** — One line per Phase explaining why it's separated.
3. **Command blocks** — Copy-paste-ready code blocks.
4. **Execution order** — Run order and notes between Phases.
5. **Cancel reminder** — `/ralph-loop:cancel-ralph`

### Example Output

```
## Task Summary
Fix 3 P1 + 7 P2 responsive issues based on the audit report.

## Phase Rationale
- Phase 1 (analysis): Extract responsive patterns from codebase to create a reference doc
- Phase 2 (implementation): Apply fixes in P1 → P2 order using the reference

### Phase 1 — Pattern Analysis
` ` `
/ralph-loop:ralph-loop "..." --max-iterations 5 --completion-promise "PHASE1_DONE"
` ` `

### Phase 2 — P1 + P2 Fixes
` ` `
/ralph-loop:ralph-loop "..." --max-iterations 20 --completion-promise "TADA"
` ` `

## Execution Order
1. Run Phase 1 → confirm completion
2. Run Phase 2
To cancel at any time: `/ralph-loop:cancel-ralph`
```

## Rules

- **No subjective completion criteria**: Banned phrases — "works well", "looks clean", "properly done."
- **No prompt without verification**: At least one automated check (tsc, test, lint, build) is mandatory.
- **No missing namespace**: Always write `/ralph-loop:ralph-loop` and `/ralph-loop:cancel-ralph`.
- **No missing escape hatch**: Every Phase MUST have a "When Stuck" section.
- **No oversized single Phase**: Do not put more than 8 independent items in one Phase. Recommend splitting.

## Conversation Flow

### Standard Flow

```
[User]      → Describes the task
[Assistant] → Asks interview questions (1 round, max 5 questions)
[User]      → Answers
[Assistant] → Generates Phase plan + command blocks
[Assistant] → Asks: "Ready to run?" with options
[User]      → Chooses an option
[Assistant] → Executes accordingly
```

### Quick-Run Flow

If the user includes phrases like "run immediately", "just do it", "바로 실행", "바로 시작", or "--run" in their initial message:

1. Conduct the interview as normal (skip if enough context is provided).
2. Generate the command blocks.
3. **Set up pipeline state file with queue** and **immediately execute Phase 1** without confirmation.
4. Show the command and queue that was set up so the user can see what's running.

### Post-Generation Action

After generating all command blocks, ALWAYS end with this prompt:

**For multi-phase tasks:**

```
---
**Ready to run?**
- **y** / **yes** / **실행** → Pipeline mode: run all phases automatically (Phase 1 → 2 → 3, no stops between phases)
- **step** / **단계별** → Manual mode: run Phase 1 only, I'll ask before each next phase
- **n** / **no** / **아니오** → Commands are above, copy-paste when ready
- **edit** / **수정** → Tell me what to change
```

**For single-phase tasks:**

```
---
**Ready to run?**
- **y** / **yes** / **실행** → Start immediately
- **n** / **no** / **아니오** → Command is above, copy-paste when ready
- **edit** / **수정** → Tell me what to change
```

### Execution Modes

**Pipeline mode (default for "y"):**

1. Create the state file with the first phase as active and remaining phases in `queue`
2. Execute Phase 1 via `/ralph-loop:ralph-loop`
3. When Phase 1 promise is detected, the stop hook automatically loads Phase 2 from queue
4. Continues until all phases complete — no user intervention between phases

**Manual mode ("step"):**

1. Execute Phase 1 via `/ralph-loop:ralph-loop`
2. When Phase 1 completes, prompt the user to confirm before starting Phase 2
3. Repeat for each phase
