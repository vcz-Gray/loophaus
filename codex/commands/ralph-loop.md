---
name: ralph-loop
description: "Start a Ralph Loop — self-referential iterative development loop"
argument-hint: "PROMPT [--max-iterations N] [--completion-promise TEXT]"
---

# Ralph Loop Command

You are about to start a Ralph Loop. Parse the user's arguments as follows:

## Argument Parsing

1. Extract `--max-iterations N` (default: 20). Must be a positive integer or 0 (unlimited).
2. Extract `--completion-promise TEXT` (default: "TADA"). Multi-word values must be quoted.
3. Everything else is the **prompt** — the task description.

## Setup

Run this command to initialize the Ralph loop state file:

```bash
node -e "
import { writeState } from '${RALPH_CODEX_ROOT}/store/state-store.mjs';
await writeState({
  active: true,
  prompt: PROMPT_HERE,
  completionPromise: PROMISE_HERE,
  maxIterations: MAX_HERE,
  currentIteration: 0,
  sessionId: ''
});
"
```

Replace `PROMPT_HERE`, `PROMISE_HERE`, and `MAX_HERE` with the parsed values. Use proper JSON string escaping for the prompt.

Alternatively, create the state file directly at `.codex/ralph-loop.state.json`:

```json
{
  "active": true,
  "prompt": "<user's prompt>",
  "completionPromise": "<promise text>",
  "maxIterations": 20,
  "currentIteration": 0,
  "sessionId": ""
}
```

## After Setup

Display this message to the user:

```
Ralph loop activated!

Iteration: 1
Max iterations: <N or "unlimited">
Completion promise: <promise text>

The stop hook will now block session exit and feed the SAME PROMPT back.
Your previous work persists in files and git history.
To cancel: /cancel-ralph
```

Then immediately begin working on the user's task prompt.

## Rules

- When a completion promise is set, you may ONLY output `<promise>TEXT</promise>` when the statement is genuinely and completely TRUE.
- Do NOT output false promises to exit the loop.
- Each iteration sees your previous work in files. Build on it incrementally.
- If stuck, document what's blocking and try a different approach.
