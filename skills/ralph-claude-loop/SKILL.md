---
name: ralph-claude-loop
description: "Start a PRD-driven Ralph Loop in Claude Code. Reads prd.json + progress.txt each iteration. Uses the official ralph-loop stop hook."
---

# Ralph Claude Loop

Start a Ralph Loop optimized for Claude Code. This skill sets up the loop state, activates the official stop hook, and begins working on the first pending story from prd.json.

## Prerequisites

- The `ralph-codex` plugin must be installed
- A `prd.json` file must exist in the project root (generate one with `/ralph-interview`)

## How It Works

1. This skill writes `.claude/ralph-loop.local.md` (the state file)
2. ralph-codex's stop hook reads this file and intercepts session exits
3. Each iteration follows the **Implement → Discover → Plan → Continue** cycle
4. When all stories pass: output `<promise>COMPLETE</promise>`

### Iteration Cycle (per story)

```
┌─ IMPLEMENT ─────────────────────────────┐
│ Pick next story → implement → verify    │
└─────────────────────┬───────────────────┘
                      ▼
┌─ DISCOVER ──────────────────────────────┐
│ Review what you just built.             │
│ Did you find:                           │
│  - Hidden complexity?                   │
│  - Missing edge cases?                  │
│  - New dependencies?                    │
│  - Broken assumptions from the PRD?     │
└─────────────────────┬───────────────────┘
                      ▼
┌─ UPDATE PRD ────────────────────────────┐
│ If discoveries found:                   │
│  1. Add new stories to prd.json         │
│  2. Log discoveries in progress.txt     │
│  3. Adjust max_iterations if needed     │
│ If nothing new: skip                    │
└─────────────────────┬───────────────────┘
                      ▼
┌─ CONTINUE ──────────────────────────────┐
│ Mark current story done → next story    │
└─────────────────────────────────────────┘
```

## Activation

Run the setup script to create the state file:

```!
mkdir -p .claude && cat > .claude/ralph-loop.local.md << 'RALPH_STATE'
---
active: true
iteration: 1
session_id:
max_iterations: $MAX_ITERATIONS
completion_promise: "COMPLETE"
started_at: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
---

Read prd.json for the task plan. Read progress.txt for current status (check Codebase Patterns section first).
Pick the highest priority user story where passes is false.
Implement that ONE story.
Run verification: $VERIFY_CMD.
On failure: read error, fix, retry up to 3 times.
On success: commit with message 'feat: [Story ID] - [Story Title]'.
Update prd.json: set passes to true for the completed story.

DISCOVERY PHASE — After completing the story, review what you just built:
- Did implementation reveal hidden complexity not covered by existing stories?
- Are there missing edge cases, error handling, or integration points?
- Did you discover new dependencies or broken assumptions?
- Are there follow-up tasks needed for what you just built?
If YES to any: add new user stories to prd.json with the next available ID (e.g. US-010), set passes: false, and set priority appropriately. Log the discovery in progress.txt under "## Discoveries" with rationale.
If NO: skip, just append progress to progress.txt with learnings.

If ALL stories (including newly added ones) have passes true, output <promise>COMPLETE</promise>.
When stuck after 3 retries: set notes field in prd.json with error details, move to next story.
RALPH_STATE
```

Replace `$MAX_ITERATIONS` with the desired limit and `$VERIFY_CMD` with the project's verification command.

After setup, immediately begin working:

1. Read prd.json
2. Pick the first story with `passes: false`
3. Implement it — write real code, make real changes
4. Run verification
5. Commit
6. **Discovery Phase** — review what you just built for hidden complexity, missing cases, new dependencies
7. If discoveries found: add new stories to prd.json, log in progress.txt
8. Update prd.json (mark current story done) and progress.txt
9. The stop hook will re-inject this prompt for the next story

### Discovery Phase Rules

- New stories MUST follow the same format (id, title, description, acceptanceCriteria, priority, passes: false)
- Use next sequential ID (if last is US-007, new ones start at US-008)
- Set priority relative to remaining work (urgent discoveries get lower priority number)
- Do NOT add trivial or cosmetic items — only genuinely missing functionality
- Log each discovery in progress.txt: what was found, why it matters, which story revealed it
- If adding stories increases scope significantly, update `max_iterations` in `.claude/ralph-loop.local.md`

### max_iterations Auto-Adjustment

When adding N new stories, update max_iterations:

```
new_max = current_iteration + (remaining_stories + new_stories) * 2 + 3
```

Only increase, never decrease. Update via:

```bash
sed -i '' "s/^max_iterations: .*/max_iterations: $NEW_MAX/" .claude/ralph-loop.local.md
```

CRITICAL RULE: Only output `<promise>COMPLETE</promise>` when ALL stories in prd.json (including dynamically added ones) have `passes: true`. Do not output it prematurely.
