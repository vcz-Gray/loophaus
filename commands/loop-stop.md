---
description: "Stop active loop"
allowed-tools: ["Bash", "Read"]
---

# /loop-stop — Stop Active Loop

1. Check if `.loophaus/state.json` exists using a cross-platform Node command.
   - If not found, also check legacy path `.claude/ralph-loop.local.md`.

2. **If NOT_FOUND** on both: Say "No active loop found."

3. **If EXISTS** (.loophaus/state.json):
   - Read the file to get `currentIteration`
   - Remove it with a cross-platform Node file command
   - Report: "Stopped loop at iteration N."

4. **If LEGACY** (.claude/ralph-loop.local.md):
   - Read it to get the iteration field
   - Remove it with a cross-platform Node file command
   - Report: "Stopped loop at iteration N. (migrated from legacy path)"
