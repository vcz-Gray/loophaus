---
description: "Start iterative dev loop"
argument-hint: "PROMPT [--max-iterations N] [--completion-promise TEXT]"
allowed-tools: ["Bash"]
---

# /loop — Start Iterative Dev Loop

## Pre-flight

Run `loophaus update-check` quietly before starting.
If it reports an available update and auto-upgrade is enabled, run `loophaus upgrade` and continue.
If it reports an available update and auto-upgrade is disabled, show one-line notice: `loophaus update available. Run: loophaus upgrade`.
If the check fails or no update is available, continue silently.

---

Execute the setup script to initialize the loop:

```!
node "${CLAUDE_PLUGIN_ROOT}/scripts/setup-loop.mjs" $ARGUMENTS
```

Work on the task. When you try to exit, the stop hook feeds the SAME PROMPT back for the next iteration. Your previous work persists in files and git history.

CRITICAL: If a completion promise is set, ONLY output it when genuinely complete. Do not output false promises to escape the loop.
