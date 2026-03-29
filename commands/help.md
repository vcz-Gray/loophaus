---
description: "Explain loophaus plugin and available commands"
---

# Loophaus Plugin Help

Please explain the following to the user:

## What is Loop?

Loop implements the Ralph Wiggum technique — an iterative development methodology based on continuous AI loops, pioneered by Geoffrey Huntley.

**Core concept:**

```bash
while :; do
  cat PROMPT.md | claude-code --continue
done
```

The same prompt is fed to Claude repeatedly. The "self-referential" aspect comes from Claude seeing its own previous work in the files and git history, not from feeding output back as input.

**Each iteration:**

1. Claude receives the SAME prompt
2. Works on the task, modifying files
3. Tries to exit
4. Stop hook intercepts and feeds the same prompt again
5. Claude sees its previous work in the files
6. Iteratively improves until completion

## Available Commands

### /loop <PROMPT> [OPTIONS]

Start a loop in your current session.

**Usage:**

```
/loop "Refactor the cache layer" --max-iterations 20
/loop "Add tests" --completion-promise "TESTS COMPLETE"
```

**Options:**

- `--max-iterations <n>` — Max iterations before auto-stop
- `--completion-promise <text>` — Promise phrase to signal completion

### /loop-stop

Stop an active loop (removes the loop state file).

### /loop-plan

Interactive interview that generates a PRD with right-sized stories, activates the loop, and starts implementing story by story.

**Usage:**

```
/loop-plan Add user authentication with JWT and login UI
```

### /loop-pulse

Check the status of an active loop, including iteration count and story progress.

### /loop-orchestrator

Multi-agent orchestration patterns for parallel work streams.

## Available Skills (via Skill tool)

- `loophaus:ralph-interview` — PRD generation + loop start
- `loophaus:ralph-orchestrator` — Multi-agent patterns
- `loophaus:ralph-loop` — Direct loop execution
- `loophaus:cancel-ralph` — Cancel active loop

## Key Concepts

### Completion Promises

To signal completion, Claude must output a `<promise>` tag:

```
<promise>TASK COMPLETE</promise>
```

### PRD-driven Loops

loophaus extends basic Loop with PRD (prd.json) and progress tracking (progress.txt), enabling story-by-story implementation with learnings carried across iterations.

## Learn More

- Original technique: https://ghuntley.com/ralph/
- loophaus: https://github.com/vcz-Gray/ralph-codex
