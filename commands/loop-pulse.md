---
description: "Check loop status"
allowed-tools:
  [
    "Read(.loophaus/state.json)",
    "Read(.claude/ralph-loop.local.md)",
    "Read(prd.json)",
    "Read(progress.txt)",
  ]
---

# /loop-pulse — Check Loop Status

1. Read `.loophaus/state.json` (or legacy `.claude/ralph-loop.local.md`)
   - If neither exists: "No active loop."

2. If active, display:
   ```
   Loop Status
   ───────────
   Active:     yes
   Iteration:  5/20
   Promise:    TASK COMPLETE
   ```

3. If `prd.json` exists, also show:
   ```
   Stories
   ───────
   ✓ US-001  Add login API
   ✓ US-002  Add auth middleware
   → US-003  Add JWT refresh (in progress)
     US-004  Add logout endpoint

   Progress: 2/4 done
   ```

4. If `progress.txt` exists, show last 5 lines.
