---
description: "Start iterative dev loop"
argument-hint: "PROMPT [--max-iterations N] [--completion-promise TEXT]"
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/setup-ralph-loop.sh:*)"]
---

# /loop — Start Iterative Dev Loop

Execute the setup script to initialize the loop:

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/setup-ralph-loop.sh" $ARGUMENTS
```

Work on the task. When you try to exit, the stop hook feeds the SAME PROMPT back for the next iteration. Your previous work persists in files and git history.

CRITICAL: If a completion promise is set, ONLY output it when genuinely complete. Do not output false promises to escape the loop.
