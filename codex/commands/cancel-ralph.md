---
name: cancel-ralph
description: "Cancel the active Ralph Loop"
---

# Cancel Ralph

To cancel the Ralph loop:

1. Check if the state file exists at `.codex/ralph-loop.state.json`.

2. **If NOT found**: Say "No active Ralph loop found."

3. **If found**:
   - Read the state file to get `currentIteration`.
   - Set `active` to `false` by running:

   ```bash
   node -e "
   import { readState, writeState } from '${RALPH_CODEX_ROOT}/lib/state.mjs';
   const state = await readState();
   const iter = state.currentIteration;
   state.active = false;
   await writeState(state);
   console.log('Cancelled Ralph loop at iteration ' + iter);
   "
   ```

   Alternatively, edit `.codex/ralph-loop.state.json` directly and set `"active": false`.
   - Report: "Cancelled Ralph loop (was at iteration N)."
