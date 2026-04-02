---
description: "Cancel active Ralph Loop"
allowed-tools: ["Bash", "Read"]
hide-from-slash-command-tool: "true"
---

# Cancel Ralph

To cancel the Ralph loop:

1. Check if `.claude/ralph-loop.local.md` exists using a cross-platform Node command.

2. **If NOT_FOUND**: Say "No active Ralph loop found."

3. **If EXISTS**:
   - Read `.claude/ralph-loop.local.md` to get the current iteration number from the `iteration:` field
   - Remove the file using a cross-platform Node file command
   - Report: "Cancelled Ralph loop (was at iteration N)" where N is the iteration value
