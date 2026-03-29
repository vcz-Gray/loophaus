---
name: ralph-claude-cancel
description: "Cancel the active Loop in Claude Code"
---

# Cancel Loop (Claude Code)

To cancel the loop:

1. Check if `.loophaus/state.json` exists using Bash: `test -f .loophaus/state.json && echo "EXISTS" || echo "NOT_FOUND"`
   - If not found, also check legacy path: `test -f .claude/ralph-loop.local.md && echo "LEGACY" || echo "NOT_FOUND"`

2. **If NOT_FOUND** on both: Say "No active loop found."

3. **If EXISTS** (.loophaus/state.json):
   - Read `.loophaus/state.json` to get the current iteration number from `currentIteration`
   - Remove the file using Bash: `rm .loophaus/state.json`
   - Report: "Stopped loop at iteration N."

4. **If LEGACY** (.claude/ralph-loop.local.md):
   - Read `.claude/ralph-loop.local.md` to get the iteration number from the `iteration:` field
   - Remove the file using Bash: `rm .claude/ralph-loop.local.md`
   - Report: "Stopped loop at iteration N. (migrated from legacy path)"
