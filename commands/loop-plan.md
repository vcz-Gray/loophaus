---
description: "Plan and start loop via interactive interview — auto-parallelizes across worktrees"
argument-hint: "TASK_DESCRIPTION"
allowed-tools: ["Bash", "Read", "Write", "Edit", "Glob", "Grep", "Agent", "Skill"]
---

# /loop-plan — Plan, Parallelize, Execute, Merge

End-to-end workflow: interview → PRD → parallel distribution → loop execution → merge.
The user runs `/loop-plan` once and gets a single merged branch with all work done.

---

## Phase 1: Discovery Interview

Ask 3-5 focused questions about $ARGUMENTS:

| Category | What to confirm |
|----------|----------------|
| Scope | Single feature? Multi-file? Full refactor? |
| Success criteria | What counts as "done"? |
| Verification | `npm test`, `npx tsc`, lint commands? |
| References | Existing code, patterns to follow? |
| Parallelism | Multiple services? Independent file groups? |
| Constraints | Must not break existing tests? Library restrictions? |

One round of questions only. Skip questions already answered in $ARGUMENTS.

## Phase 2: PRD Generation

Generate `prd.json`:

```json
{
  "title": "<project title>",
  "description": "<1-2 sentence summary>",
  "userStories": [
    {
      "id": "US-001",
      "title": "<story title>",
      "description": "<what to implement>",
      "acceptanceCriteria": ["<criterion 1>", "<criterion 2>"],
      "priority": 1,
      "passes": false,
      "group": "<ownership group — e.g., frontend, backend, auth, database>",
      "testCommand": "<optional: npm test -- US-001>"
    }
  ]
}
```

Rules:
- Right-size stories: each completable in 1-2 iterations
- Assign `group` to each story for parallel distribution
- Order by `priority` (dependencies first)
- Include `testCommand` when verification is possible

Present PRD to user for approval before proceeding.

## Phase 3: Parallelism Assessment

Score the task for parallel execution:

| Factor | Score |
|--------|-------|
| Stories span 3+ directories | +2 |
| Stories are independent (no shared state) | +2 |
| Multiple services (frontend/backend/auth) | +3 |
| 6+ stories total | +1 |
| Stories need full codebase context | -2 |
| Strict ordering required | -3 |
| Cross-file understanding needed | -1 |

**Decision:**
- Score >= 3 → **Parallel mode** (distribute across worktrees by `group`)
- Score < 3 → **Sequential mode** (single loop, stories in order)

Display the score and recommendation to the user. Proceed with the recommended mode unless the user overrides.

## Phase 4A: Parallel Execution (score >= 3)

### Step 1: Distribute stories by group

Group stories by their `group` field. Each group becomes a worktree.

```bash
# Create the current branch as base for worktrees
BASE_BRANCH=$(git branch --show-current)
```

### Step 2: Create worktrees and distribute PRDs

For each group, use the Agent tool to spawn a subagent in an isolated worktree:

```
Agent(
  prompt: "Implement the following stories from prd.json in this worktree.
           Work on one story at a time. For each story:
           1. Read prd.json and pick the next story where passes=false
           2. Implement the story
           3. Verify with the test command if provided
           4. Set passes=true in prd.json
           5. Commit: git add -A && git commit -m 'feat: <story-id> <title>'

           When ALL stories pass, output <promise>TASK COMPLETE</promise>.

           Stories assigned to you:
           <filtered stories for this group>",
  isolation: "worktree",
  run_in_background: true,
  name: "<group-name>"
)
```

Launch ALL group agents in a single message (parallel execution).

### Step 3: Wait and collect results

Monitor agent completion. When all agents finish:

1. List completed worktrees and their branches
2. For each worktree branch, check if all assigned stories passed

### Step 4: Merge results

Merge all worktree branches back to the base branch using squash strategy:

```bash
git checkout $BASE_BRANCH

# For each completed worktree branch:
git merge --squash loophaus/<group-name>
git commit -m "feat: merge <group-name> stories"
```

If merge conflicts occur:
1. Report the conflict to the user
2. Suggest manual resolution
3. Do NOT force-resolve

### Step 5: Cleanup

```bash
# Remove worktrees
git worktree list | grep .loophaus/worktrees | awk '{print $1}' | xargs -I {} git worktree remove {} --force
# Remove branches
git branch | grep loophaus/ | xargs git branch -D
```

### Step 6: Final verification

Run the full test/verification command on the merged result.
Update the main `prd.json` with all stories marked as `passes: true`.

## Phase 4B: Sequential Execution (score < 3)

Single loop, no worktrees:

1. Create `.loophaus/state.json`:
```json
{
  "active": true,
  "prompt": "Read prd.json. Pick next story where passes=false. Implement, verify, commit. Update progress.txt.",
  "completionPromise": "TASK COMPLETE",
  "maxIterations": <stories * 2 + 3>,
  "currentIteration": 0,
  "sessionId": ""
}
```

2. Start working on US-001 immediately.
3. Each iteration: implement one story, verify, commit, update prd.json.
4. Output `<promise>TASK COMPLETE</promise>` when ALL stories pass.

## Phase 5: Summary Report

After completion (parallel or sequential), output:

```
Loop Plan Complete
══════════════════

Mode:       parallel (3 worktrees) | sequential
Stories:    7/7 done
Duration:   ~15 minutes
Iterations: 12 total (across all workers)

Stories:
  ✓ US-001  Add login API          (backend, 2 iterations)
  ✓ US-002  Add auth middleware     (backend, 1 iteration)
  ✓ US-003  Add login UI           (frontend, 3 iterations)
  ...

Branch:     feature/auth-system (all work merged)
Verify:     npm test ✓
```

## Rules

- ALWAYS present PRD for user approval before execution
- ALWAYS show parallelism score and recommendation
- If parallel: launch ALL agents simultaneously (single message with multiple Agent calls)
- If merge conflict: STOP and report. Do not auto-resolve.
- Use `<promise>TASK COMPLETE</promise>` ONLY when genuinely complete
- Update `progress.txt` with learnings after each story
