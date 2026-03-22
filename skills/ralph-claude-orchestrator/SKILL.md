---
name: ralph-claude-orchestrator
description: "Multi-agent orchestration patterns for Ralph Loop in Claude Code. Uses the Agent tool for parallel subagent spawning."
---

# Ralph Claude Orchestrator — Multi-Agent Patterns

Orchestration patterns optimized for Claude Code's Agent tool. Analyzes tasks and recommends the best combination of sequential loops and parallel subagents.

## Subagent Configuration (Claude Code Agent Tool)

```
Agent tool parameters:
- description: "short task description"
- prompt: "detailed instructions"
- subagent_type: "general-purpose" | "Explore" | "Plan" | "coder-fe" | "coder-be"
- isolation: "worktree"  (gives agent an isolated repo copy)
- run_in_background: true  (for parallel execution)
```

**Best practices:**

- Use `subagent_type: "Explore"` for read-only scanning — faster and safer
- Use `isolation: "worktree"` when agents write to files — prevents merge conflicts
- Launch parallel agents in a single message with multiple Agent tool calls
- Use `run_in_background: true` for truly independent work streams

## Orchestration Patterns

### Pattern 1: Parallel Explore then Sequential Implement

Best for: Large codebases where you need to understand before you change.

```
Phase 1 (Parallel Subagents via Agent tool):
├── Agent "fe-scan" (Explore, background): Scan src/frontend/** → .ralph/reports/frontend.md
├── Agent "be-scan" (Explore, background): Scan src/backend/** → .ralph/reports/backend.md
└── Agent "db-scan" (Explore, background): Scan src/db/** → .ralph/reports/db.md

Phase 2 (Ralph Claude Loop):
└── Read merged reports → implement fixes story by story via prd.json
```

### Pattern 2: Divide by Ownership

Best for: Multi-service changes where files do not overlap.

```
Spawn agents with isolation: "worktree":
├── Agent "fe-dev" (worktree): ONLY touch src/frontend/** → commit per item
├── Agent "be-dev" (worktree): ONLY touch src/backend/** → commit per item
└── Agent "auth-dev" (worktree): ONLY touch src/auth/** → commit per item

After all complete: merge branches, run integration tests
```

### Pattern 3: Fan-Out / Fan-In Research

Best for: Comprehensive analysis before any action.

```
Fan-Out (parallel Agent calls in single message):
├── Agent "security" (Explore): Audit for OWASP top 10 → findings.md
├── Agent "perf" (Explore): Profile and benchmark → findings.md
└── Agent "a11y" (Explore): Check accessibility → findings.md

Fan-In (Ralph Claude Loop):
└── Synthesize all findings → create action plan → implement
```

### Pattern 4: Scout-Then-Execute

Best for: Unfamiliar codebases or risky changes.

```
Scout (single Agent, Explore type):
└── Map codebase, trace dependencies, identify risks → scout-report.md

Execute (Ralph Claude Loop):
└── Use scout report as reference, implement changes
```

### Pattern 5: Pipeline with Checkpoints

Best for: Complex multi-stage transformations.

```
Stage 1 (Ralph Claude Loop): Parse + validate → intermediate output
  checkpoint: verify schema
Stage 2 (Ralph Claude Loop): Transform → draft output
  checkpoint: run regression tests
Stage 3 (Parallel Agents): Apply to multiple files
  checkpoint: final integration test
```

## Decision Matrix

| Factor                         | Score |
| ------------------------------ | ----- |
| Files span 3+ directories      | +2    |
| Items are independent          | +2    |
| Need full context to decide    | -2    |
| Order matters                  | -2    |
| 10+ similar items              | +1    |
| Needs cross-file understanding | -1    |
| Multiple services/repos        | +3    |

- **Score >= 3**: Recommend parallel subagents
- **Score 0-2**: Sequential loop, optional scout phase
- **Score < 0**: Single sequential Ralph Loop

## Report Convention

```
.ralph/
└── reports/
    ├── {agent-name}.md       # Individual agent output
    ├── merged.md             # Combined findings
    └── plan.md               # Action plan
```

## Integration with Ralph Claude Interview

When `/ralph-claude-interview` invokes this skill, provide:

1. Recommended pattern
2. Agent breakdown with roles and file boundaries
3. Phase structure and checkpoints
4. Ready-to-embed Agent tool call instructions for the loop prompt
