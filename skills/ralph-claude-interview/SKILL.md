---
name: ralph-claude-interview
description: "Claude Code interview that generates PRD, activates the official ralph-loop stop hook, and starts working immediately. Uses Skill tool for loop invocation."
---

# Ralph Claude Interview

You are an expert at generating PRD-driven Ralph Loop tasks for Claude Code.
Interview the user, generate prd.json, then invoke the official ralph-loop plugin via Skill tool to start the loop.

## Core Principles

- **PRD-driven**: prd.json (ralph-skills compatible) tracks all stories
- **progress.txt**: Append-only log with Codebase Patterns section
- **One story per iteration**: Each loop cycle implements ONE story
- **Official stop hook**: Uses `ralph-loop:ralph-loop` — the official Claude Code plugin
- **Skill tool invocation**: Start the loop via the Skill tool, not by printing commands

## Interview Process

Ask **concise questions** for missing items. Max 3-5 per round, one round only.

| Category                  | What to confirm                                      |
| ------------------------- | ---------------------------------------------------- |
| **Scope**                 | Single feature? Multi-file? Full refactor?           |
| **Success criteria**      | What counts as "done"?                               |
| **Verification commands** | `npx tsc --noEmit`, `npm test`, `npm run lint`, etc. |
| **References**            | Existing code, files, or patterns to follow?         |
| **Priority**              | P1/P2 or other tiers?                                |
| **Constraints**           | Must not break existing tests? Library restrictions? |
| **When stuck**            | Document? Skip? Suggest alternative?                 |
| **Parallelism potential** | Multiple services? Independent file groups?          |

## Phase Design

- **Research needed** → Phase 1: Analysis, Phase 2: Implementation
- **8+ items** → Split by nature (P1/P2, frontend/backend)
- **Dependencies** → Prerequisite work first
- **5 or fewer** → Single phase fine

### Parallelism (ralph-claude-orchestrator)

| Factor                          | Score |
| ------------------------------- | ----- |
| Files span 3+ dirs              | +2    |
| Items independent               | +2    |
| Need full context               | -2    |
| Order matters                   | -2    |
| 10+ similar items               | +1    |
| Cross-file understanding needed | -1    |
| Multiple services               | +3    |

Score >= 3: Use parallel Agent tool subagents in the prompt.

### max-iterations

| Task             | Iterations |
| ---------------- | ---------- |
| Research only    | 3-5        |
| 1-3 simple fixes | 5-10       |
| 4-7 medium items | 10-20      |
| 8+ large items   | 20-30      |
| TDD feature      | 15-30      |

Formula: `story_count x 2 + 5`

## PRD Format: prd.json

ralph-skills compatible format:

```json
{
  "project": "[Name]",
  "description": "[Description]",
  "userStories": [
    {
      "id": "US-001",
      "title": "[Title]",
      "description": "As a [user], I want [feature] so that [benefit]",
      "acceptanceCriteria": ["Criterion 1", "Typecheck passes"],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

### Story Rules

- Each story completable in ONE iteration
- Dependencies ordered by priority (schema → backend → UI)
- Acceptance criteria must be verifiable, not vague
- Always include "Typecheck passes" or equivalent

## Rules

- No subjective criteria ("works well", "looks clean")
- At least one automated verification check per prompt
- Every prompt has a "When Stuck" section
- Max 8 items per phase
- Always use prd.json format
- Default promise: COMPLETE
- Always overwrite existing prd.json/progress.txt without asking

## Conversation Flow

```
[User]      → /ralph-claude-interview "build X"
[Assistant] → Interview questions (skip if enough context)
[User]      → Answers
[Assistant] → Shows PRD briefly, asks "Ready?"
[User]      → "y"
[Assistant] → Writes files + invokes ralph-loop:ralph-loop via Skill tool
```

### Quick-Run

If user includes "run immediately", "just do it", "바로 실행", "바로 시작", "--run":
Skip "Ready?" prompt. Write files and invoke immediately.

## Activation Sequence

When user confirms, execute ALL steps in ONE response:

### Step 1: Write prd.json via Bash

Always overwrite. Do NOT ask about existing files.

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

### Step 3: Invoke the official ralph-loop via Skill tool

This is the critical step. You MUST use the Skill tool to start the loop:

```
Skill tool call:
  skill: "ralph-loop:ralph-loop"
  args: "Read prd.json for task plan. Read progress.txt for status (Codebase Patterns first). Pick highest priority story where passes is false. Implement that ONE story. Run verification: <VERIFY_CMD>. On failure: fix and retry, max 3. On success: commit 'feat: [Story ID] - [Title]'. Update prd.json passes to true. Append to progress.txt with learnings. If ALL stories pass: <promise>COMPLETE</promise>. When stuck: set notes in prd.json, skip to next." --max-iterations <N> --completion-promise "COMPLETE"
```

Replace `<VERIFY_CMD>` and `<N>` with actual values.

### IMPORTANT: Actually invoke the Skill tool

After writing prd.json and progress.txt, you MUST make a real Skill tool call.

WRONG:

- Printing the /ralph-loop command as text
- Writing files and saying "ready"
- Describing what would happen

RIGHT:

- Use the Skill tool with skill="ralph-loop:ralph-loop" and the generated args
- This actually starts the loop — the official stop hook takes over from there

The official ralph-loop plugin will:

1. Run the setup script (creates `.claude/ralph-loop.local.md`)
2. Inject the prompt into the session
3. You start working on US-001
4. When you finish and try to exit, the stop hook re-injects the prompt
5. You pick US-002, and so on until `<promise>COMPLETE</promise>`
