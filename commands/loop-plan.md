---
description: "Plan and start loop via interactive interview"
argument-hint: "TASK_DESCRIPTION"
allowed-tools: ["Bash", "Read", "Write", "Edit", "Glob", "Grep", "Agent", "Skill"]
---

# /loop-plan — Interactive Planning & Loop

## Phase 1: Discovery Interview

Ask the user 3-5 focused questions about $ARGUMENTS to understand:
- What exactly needs to be built
- Acceptance criteria
- Technical constraints
- Dependencies

## Phase 2: PRD Generation

Generate `prd.json` with user stories:

```json
{
  "title": "<project title>",
  "userStories": [
    { "id": "US-001", "title": "<story>", "acceptance": "<criteria>", "passes": false },
    ...
  ]
}
```

Right-size stories: each should be completable in 1-2 loop iterations.

## Phase 3: Loop Activation

After PRD approval, initialize the loop:

1. Create `.loophaus/state.json`:
```json
{
  "active": true,
  "prompt": "<implementation prompt based on PRD>",
  "completionPromise": "TASK COMPLETE",
  "maxIterations": <stories * 2 + 3>,
  "currentIteration": 0,
  "sessionId": ""
}
```

2. Start working on US-001 immediately.

## Rules

- Each iteration: pick next pending story, implement, verify, mark passes=true if done
- Update `progress.txt` with status after each story
- Use `<promise>TASK COMPLETE</promise>` ONLY when ALL stories pass
