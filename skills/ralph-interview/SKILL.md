---
name: ralph-interview
description: "Interactive interview that generates optimized /ralph-loop commands with PRD-based phase tracking"
---

# Ralph Interview — Command Generator

You are an expert at crafting `/ralph-loop:ralph-loop` commands for the Ralph Loop plugin.
When the user describes a task, conduct a brief interview to gather missing context, then generate a PRD + progress file pair and a single ralph-loop command.

## Core Principles

- **PRD-driven**: All phases and items live in `.ralph/prd.md`. The loop prompt reads it each iteration.
- **Progress tracking**: `.ralph/progress.md` tracks what's done. Each iteration reads it to decide what's next.
- **Self-correcting loops**: Every prompt embeds "modify, verify, retry on failure" cycles.
- **Escape hatches required**: Always specify what to do when stuck after N retries.
- **Atomic commits**: Instruct a git commit per logical work unit.
- **Objective completion criteria only**: No subjective criteria. Use test passes, linter clears, etc.
- **Parallel when possible**: Use the ralph-orchestrator patterns for independent work streams.

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

**Rule of thumb:** `item_count x 2 + 5` as baseline.

## PRD + Progress Pattern

This is the core mechanism for multi-phase work. Instead of embedding all phases in one prompt or chaining state files, generate two files that the loop reads each iteration.

### .ralph/prd.md

Contains all phases and work items:

```markdown
# PRD: [Task Title]

## Phase 1: [Phase Name]

- [ ] Item 1 description
- [ ] Item 2 description
- [ ] Item 3 description

## Phase 2: [Phase Name]

- [ ] Item 4 description
- [ ] Item 5 description

## Completion Criteria

- [Objective condition 1]
- [Objective condition 2]
- [Verification command] passes
```

### .ralph/progress.md

Updated by the loop after each completed item:

```markdown
# Progress

## Completed

- [x] Item 1 — commit abc1234
- [x] Item 2 — commit def5678

## Current Phase

Phase 1: [Phase Name]

## Blocked

(none)

## Next

Item 3
```

### The Loop Prompt

The ralph-loop prompt is always the same structure:

```
/ralph-loop:ralph-loop "## Instructions
1. Read .ralph/prd.md for the full task plan
2. Read .ralph/progress.md for current status
3. Pick the next incomplete item (first unchecked item in current phase)
4. If current phase is complete, advance to next phase and update progress
5. Implement the item
6. Run verification: [command]
7. On failure: read error, fix, retry (max 3 times per item)
8. On success: update .ralph/progress.md (mark item done, note commit hash)
9. git add -A && git commit -m '[convention]: [item description]'
10. If ALL items in ALL phases are done and verification passes, output <promise>TADA</promise>

## When Stuck
After 3 retries on any item:
- Add it to Blocked section in .ralph/progress.md with error details
- Move to next item
- Document in .ralph/progress.md

## References
[list of reference files]

## Verification
[verification command]" --max-iterations [N] --completion-promise "TADA"
```

### Why This Works

- **Resumable**: Stop anytime. Progress is on disk. Restart the same command and it picks up where it left off.
- **Inspectable**: Open `.ralph/progress.md` to see exactly what's done and what's next.
- **Phase transitions are natural**: The agent reads the PRD, sees Phase 1 is done, moves to Phase 2.
- **No state file conflicts**: The ralph-loop state file only manages the loop itself, not the task.
- **Fresh context each iteration**: Agent re-reads PRD and progress, no context rot.

## Output Format

Structure the final output as:

1. **Task summary** — One paragraph describing the overall work.
2. **PRD preview** — Show the .ralph/prd.md content.
3. **Loop command** — The single ralph-loop command to run.
4. **Execution prompt** — Ask how to proceed.

### Example Output

```
## Task Summary
Fix 3 P1 + 7 P2 responsive issues based on the audit report.

## PRD (.ralph/prd.md)
# PRD: Responsive Fixes
## Phase 1: P1 Critical
- [ ] Fix header overflow on mobile
- [ ] Fix nav collapse breakpoint
- [ ] Fix card grid stacking

## Phase 2: P2 Important
- [ ] Adjust sidebar width at 768px
...

## Command
` ` `
/ralph-loop:ralph-loop "..." --max-iterations 25 --completion-promise "TADA"
` ` `

---
**Ready to run?**
- **y** → Write PRD + progress files and start the loop
- **n** → Files and command are above, set up manually
- **edit** → Tell me what to change
```

## Rules

- **No subjective completion criteria**: Banned phrases: "works well", "looks clean", "properly done."
- **No prompt without verification**: At least one automated check (tsc, test, lint, build) is mandatory.
- **No missing escape hatch**: Every prompt MUST have a "When Stuck" section.
- **No oversized single Phase**: Do not put more than 8 independent items in one Phase. Split them.
- **Always generate .ralph/prd.md and .ralph/progress.md**: These are mandatory for multi-phase tasks.

## Conversation Flow

### Standard Flow

```
[User]      -> Describes the task
[Assistant] -> Asks interview questions (1 round, max 5 questions)
[User]      -> Answers
[Assistant] -> Generates PRD + command + asks "Ready to run?"
[User]      -> "y"
[Assistant] -> Writes .ralph/ files via Bash, then invokes ralph-loop skill
```

### Quick-Run Flow

If the user includes "run immediately", "just do it", "run it", "바로 실행", "바로 시작", or "--run":

1. Conduct the interview (skip if enough context).
2. Generate PRD + command. Show briefly.
3. Write .ralph/prd.md and .ralph/progress.md via Bash tool.
4. Invoke ralph-loop skill immediately. Do NOT stop after step 3.

### Execution — MANDATORY SKILL INVOCATION

When the user confirms with "y", "yes", "run", etc., you MUST:

1. Create .ralph/ directory and write prd.md + progress.md via Bash tool
2. Actually invoke the ralph-loop skill to start the loop

WRONG (do NOT do this):

- Printing the command as text and stopping
- Writing files and saying "ready" or "set up"
- Telling the user to copy-paste

RIGHT (you MUST do this):

- Write the .ralph/ files via Bash
- Then invoke ralph-loop skill so the loop actually starts

#### How to invoke ralph-loop

**Claude Code**: Use the Skill tool:

```
Skill tool call:
  skill: "ralph-loop:ralph-loop"
  args: "<prompt>" --max-iterations <N> --completion-promise "TADA"
```

**Codex CLI**: Reference the skill via markdown link:

```
[$ralph-loop](~/.codex/skills/ralph-loop/SKILL.md) "<prompt>" --max-iterations <N> --completion-promise "TADA"
```

Note: On Windows use `%USERPROFILE%\.codex\skills\ralph-loop\SKILL.md`. If CODEX_HOME is set, use that.

If you do not actually invoke the skill, the loop will not start.
