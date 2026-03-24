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
3. Each iteration: read prd.json → pick next story → implement → verify → commit → update
4. When all stories pass: output `<promise>COMPLETE</promise>`

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
Append progress to progress.txt with learnings.
If ALL stories have passes true, output <promise>COMPLETE</promise>.
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
6. Update prd.json and progress.txt
7. The stop hook will re-inject this prompt for the next story

CRITICAL RULE: Only output `<promise>COMPLETE</promise>` when ALL stories in prd.json have `passes: true`. Do not output it prematurely.
