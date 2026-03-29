---
description: "Stop active loop"
allowed-tools:
  [
    "Bash(test -f .loophaus/state.json:*)",
    "Bash(rm .loophaus/state.json)",
    "Read(.loophaus/state.json)",
    "Bash(test -f .claude/ralph-loop.local.md:*)",
    "Bash(rm .claude/ralph-loop.local.md)",
    "Read(.claude/ralph-loop.local.md)",
  ]
---

# /loop-stop — Stop Active Loop

1. Check if `.loophaus/state.json` exists: `test -f .loophaus/state.json && echo "EXISTS" || echo "NOT_FOUND"`
   - If not found, also check legacy path: `test -f .claude/ralph-loop.local.md && echo "LEGACY" || echo "NOT_FOUND"`

2. **If NOT_FOUND** on both: Say "No active loop found."

3. **If EXISTS** (.loophaus/state.json):
   - Read the file to get `currentIteration`
   - Remove it: `rm .loophaus/state.json`
   - Report: "Stopped loop at iteration N."

4. **If LEGACY** (.claude/ralph-loop.local.md):
   - Read it to get the iteration field
   - Remove it: `rm .claude/ralph-loop.local.md`
   - Report: "Stopped loop at iteration N. (migrated from legacy path)"
