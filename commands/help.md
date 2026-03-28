---
description: "Explain Ralph Codex plugin and available commands"
---

# Ralph Codex Plugin Help

Please explain the following to the user:

## What is Ralph Loop?

Ralph Loop implements the Ralph Wiggum technique — an iterative development methodology based on continuous AI loops, pioneered by Geoffrey Huntley.

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

### /ralph-loop <PROMPT> [OPTIONS]

Start a Ralph loop in your current session.

**Usage:**

```
/ralph-loop "Refactor the cache layer" --max-iterations 20
/ralph-loop "Add tests" --completion-promise "TESTS COMPLETE"
```

**Options:**

- `--max-iterations <n>` — Max iterations before auto-stop
- `--completion-promise <text>` — Promise phrase to signal completion

### /cancel-ralph

Cancel an active Ralph loop (removes the loop state file).

### /ralph-interview

Interactive interview that generates a PRD with right-sized stories, activates the loop, and starts implementing story by story.

**Usage:**

```
/ralph-interview Add user authentication with JWT and login UI
```

### /ralph-orchestrator

Multi-agent orchestration patterns for parallel work streams.

## Available Skills (via Skill tool)

- `ralph-codex:ralph-interview` — PRD generation + loop start
- `ralph-codex:ralph-orchestrator` — Multi-agent patterns
- `ralph-codex:ralph-loop` — Direct loop execution
- `ralph-codex:cancel-ralph` — Cancel active loop

## Key Concepts

### Completion Promises

To signal completion, Claude must output a `<promise>` tag:

```
<promise>TASK COMPLETE</promise>
```

### PRD-driven Loops

ralph-codex extends basic Ralph with PRD (prd.json) and progress tracking (progress.txt), enabling story-by-story implementation with learnings carried across iterations.

## Learn More

- Original technique: https://ghuntley.com/ralph/
- ralph-codex: https://github.com/vcz-Gray/ralph-codex
