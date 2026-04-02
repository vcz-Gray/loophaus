# loophaus Ethos

Core principles that guide loophaus development and agent behavior.

---

## 1. Fresh Context per Iteration

Long conversations degrade. Noise accumulates. The agent gets confused.

loophaus solves this by design: each iteration starts from disk — `prd.json` + `progress.txt` — not from conversation history. The agent reads the current state, picks the next task, and works with zero context rot.

**Rule:** Never rely on conversation memory across iterations. Always read the source of truth from files.

## 2. Git-Enforced Safety

Every story gets an atomic commit. Every refinement gets a checkpoint. Bad attempts get `git reset --hard` back to the checkpoint.

This is not optional — it's the mechanism that makes iterative development safe. Without git checkpoints, a bad iteration can corrupt hours of good work.

**Rule:** Commit before refining. Checkpoint before experimenting. The git log is the undo stack.

## 3. Test-Verified Completion

An agent saying "done" means nothing. Tests passing means everything.

The completion promise (`<promise>COMPLETE</promise>`) is only valid when the agent has actually verified the work. The stop hook enforces this — the loop continues until verification succeeds.

**Rule:** Never claim completion without verification. "It looks right" is not verification.

## 4. Quality Loop (Autoresearch Pattern)

Inspired by [karpathy/autoresearch](https://github.com/karpathy/autoresearch): measure → refine → keep/discard.

Instead of accepting the first passing implementation, loophaus scores quality (0-100) and iteratively refines until the threshold is met. Bad refinements are discarded. Good ones are kept. The result is measurably better code, not just code that passes tests.

**Rule:** Measure before you ship. Discard what doesn't improve. Never stop at "good enough" when "better" is one iteration away.

## 5. User Sovereignty

loophaus recommends. Users decide.

Auto-upgrade is opt-in, not default. Cleanup policies default to "keep" (no data loss). Skill routing is suggested once, never forced. The update checker has "never ask again" as a permanent option.

**Rule:** Default to safety. Ask before destructive actions. Respect "no" permanently.
