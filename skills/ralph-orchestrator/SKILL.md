---
name: ralph-orchestrator
description: "Orchestration patterns for ralph-loop: subagent spawning, parallel exploration, and task decomposition strategies"
---

# Ralph Orchestrator — Multi-Agent Loop Patterns

You are an expert at designing optimal execution strategies for Ralph Loop tasks.
When asked to orchestrate a task, analyze its structure and recommend the best combination of sequential loops, parallel subagents, and phased execution.

## Core Concept

Not every task should run in a single linear loop. Complex tasks benefit from:

- **Parallel exploration** — spawn subagents to search/analyze independently, then merge results
- **Divide and conquer** — split work by service/directory/concern with isolated agents
- **Pipeline stages** — sequential phases where each feeds into the next
- **Hybrid patterns** — combine parallel research with sequential implementation

## When to Use Subagents

### Use Subagents (Parallel) When:

| Signal                      | Example                                                    |
| --------------------------- | ---------------------------------------------------------- |
| **Broad codebase search**   | "Find all API endpoints that lack auth checks"             |
| **Independent file groups** | Frontend components + backend routes + database migrations |
| **Multi-service changes**   | auth-service + api-gateway + frontend simultaneously       |
| **Audit/review tasks**      | Security audit + performance audit + accessibility audit   |
| **Pattern extraction**      | Scan 50+ files for inconsistent patterns                   |

### Do NOT Use Subagents When:

| Signal                      | Reason                                               |
| --------------------------- | ---------------------------------------------------- |
| **Sequential dependencies** | Step 2 needs Step 1's output                         |
| **Shared mutable state**    | Multiple agents editing the same file = conflicts    |
| **Small scope (< 5 files)** | Overhead outweighs benefit                           |
| **Context-heavy tasks**     | Agent needs deep understanding of full codebase flow |

## Orchestration Patterns

### Pattern 1: Parallel Explore → Sequential Implement

Best for: Large codebases where you need to understand before you change.

```
Phase 1 (Parallel Subagents):
├── Agent A: Scan src/frontend/** for pattern X → report-frontend.md
├── Agent B: Scan src/backend/** for pattern X → report-backend.md
└── Agent C: Scan src/shared/** for pattern X → report-shared.md

Phase 2 (Sequential Loop):
└── Ralph Loop: Read all reports → implement fixes in priority order
```

**Prompt pattern for Phase 1:**

```
## Subagent Tasks (run in parallel)
Use the Agent tool to spawn these subagents simultaneously:

1. Agent "frontend-scan": Search src/frontend/** for [pattern].
   Write findings to .ralph/reports/frontend-scan.md
2. Agent "backend-scan": Search src/backend/** for [pattern].
   Write findings to .ralph/reports/backend-scan.md
3. Agent "shared-scan": Search src/shared/** for [pattern].
   Write findings to .ralph/reports/shared-scan.md

After ALL agents complete, merge reports into .ralph/reports/merged.md
with a unified priority list.
```

### Pattern 2: Divide by Ownership

Best for: Multi-service changes where files don't overlap.

```
Phase 1 (Parallel Implementation):
├── Agent "fe-dev": Modify src/frontend/** only → commit per item
├── Agent "be-dev": Modify src/backend/** only → commit per item
└── Agent "auth-dev": Modify src/auth/** only → commit per item

Phase 2 (Integration Verification):
└── Ralph Loop: Run full test suite, fix any integration issues
```

**Prompt pattern:**

```
## Parallel Work Streams
Spawn these agents with strict file ownership:

1. Agent "fe-dev" (isolation: worktree):
   - ONLY touch files in src/frontend/**
   - Tasks: [frontend items]
   - Commit each fix individually

2. Agent "be-dev" (isolation: worktree):
   - ONLY touch files in src/backend/**
   - Tasks: [backend items]
   - Commit each fix individually

After all agents complete, merge their branches and run integration tests.
```

### Pattern 3: Fan-Out / Fan-In Research

Best for: Tasks that need comprehensive analysis before any action.

```
Fan-Out (Parallel):
├── Agent 1: Analyze problem from angle A → findings-a.md
├── Agent 2: Analyze problem from angle B → findings-b.md
└── Agent 3: Analyze problem from angle C → findings-c.md

Fan-In (Sequential):
└── Ralph Loop: Synthesize all findings → create action plan → implement
```

### Pattern 4: Pipeline with Checkpoints

Best for: Complex multi-stage transformations.

```
Stage 1 (Ralph Loop): Parse + validate input → intermediate.json
  ↓ checkpoint: verify intermediate.json schema
Stage 2 (Ralph Loop): Transform data → output draft
  ↓ checkpoint: run regression tests
Stage 3 (Parallel Agents): Apply fixes to multiple output files
  ↓ checkpoint: final integration test
```

### Pattern 5: Scout-Then-Execute

Best for: Unfamiliar codebases or risky changes.

```
Scout Phase (Single Agent, read-only):
└── Agent "scout": Explore codebase, map dependencies, identify risks
    → .ralph/reports/scout-report.md

Execute Phase (Ralph Loop):
└── Ralph Loop: Use scout report as reference, implement changes
```

## Subagent Configuration Reference

### Claude Code (Agent tool)

```
Agent tool parameters:
- description: "short task description"
- prompt: "detailed instructions"
- subagent_type: "general-purpose" | "Explore" | "Plan" | "coder-fe" | "coder-be" | etc.
- isolation: "worktree"  (optional — gives agent an isolated repo copy)
- run_in_background: true  (for parallel execution)
```

**Best practices:**

- Use `subagent_type: "Explore"` for read-only scanning — faster and safer
- Use `isolation: "worktree"` when agents write to files — prevents merge conflicts
- Launch parallel agents in a single message with multiple Agent tool calls
- Use `run_in_background: true` for truly independent work streams

### Codex CLI (experimental)

Codex spawns subagents via natural language prompts with keywords: "spawn", "parallel", "delegate", "one agent per".

```
# Enable in ~/.codex/config.toml
[agents]
max_threads = 6          # Max concurrent agent threads (default: 6)
max_depth = 1            # No grandchild agents (default: 1)
```

**Custom agent definitions** in `.codex/agents/` (TOML):

```toml
# .codex/agents/scanner.toml
name = "scanner"
description = "Read-only codebase explorer for pattern extraction"
model = "gpt-5.4-mini"          # Faster model for exploration
model_reasoning_effort = "low"
sandbox_mode = "read-only"
developer_instructions = """
Scan files for the requested pattern. Report findings with file paths and line numbers.
Do NOT modify any files.
"""
```

**Spawning in prompts:**

```
"Spawn one agent per service directory to scan for auth issues:
 1. scanner on src/frontend/** → .ralph/reports/frontend.md
 2. scanner on src/backend/** → .ralph/reports/backend.md
 3. scanner on src/auth/** → .ralph/reports/auth.md
 Wait for all, then summarize findings by severity."
```

**Batch processing** with `spawn_agents_on_csv`:

```
# For 100+ similar items, use CSV-driven batch spawning:
spawn_agents_on_csv:
  csv_path: .ralph/items.csv
  instruction: "Review {file_path} for {issue_type}. Return JSON via report_agent_job_result"
  output_schema: { file: string, severity: string, fix: string }
  output_csv_path: .ralph/reports/batch-results.csv
  max_concurrency: 6
```

### Model Selection Guide (Codex)

| Role                    | Recommended Model   | Reasoning Effort |
| ----------------------- | ------------------- | ---------------- |
| Coordinator / main loop | gpt-5.4             | medium           |
| Explorer / scanner      | gpt-5.4-mini        | low              |
| Reviewer / security     | gpt-5.4             | high             |
| Quick iteration / TDD   | gpt-5.3-codex-spark | medium           |

### Key Constraints

| Setting              | Default | Note                                                                    |
| -------------------- | ------- | ----------------------------------------------------------------------- |
| `agents.max_threads` | 6       | Hard cap on concurrent agents                                           |
| `agents.max_depth`   | 1       | No recursive agent spawning                                             |
| File conflicts       | N/A     | Multiple agents writing same file = conflicts. Use ownership isolation. |
| Token usage          | Higher  | Each subagent does own inference. Use faster models for workers.        |

## Report Directory Convention

All subagent outputs should follow this structure:

```
.ralph/
└── reports/
    ├── {agent-name}.md       # Individual agent output
    ├── merged.md             # Combined findings (created by orchestrator)
    └── plan.md               # Action plan derived from findings
```

This directory should be in `.gitignore` — reports are ephemeral working artifacts.

## Decision Matrix

When analyzing a task, use this scoring to decide the orchestration pattern:

| Factor                         | Score | Pattern             |
| ------------------------------ | ----- | ------------------- |
| Files span 3+ directories      | +2    | Parallel            |
| Items are independent          | +2    | Parallel            |
| Need full context to decide    | -2    | Sequential          |
| Order matters                  | -2    | Sequential          |
| 10+ similar items              | +1    | Parallel            |
| Needs cross-file understanding | -1    | Sequential          |
| Multiple services/repos        | +3    | Divide by Ownership |

- **Score >= 3**: Recommend parallel subagents
- **Score 0–2**: Recommend sequential with optional scout phase
- **Score < 0**: Recommend single sequential Ralph Loop

## Integration with Ralph Interview

When `/ralph-interview` invokes this skill, provide:

1. **Recommended pattern** — which orchestration pattern fits best
2. **Agent breakdown** — list of subagents with their roles and file boundaries
3. **Phase structure** — how phases connect and what checkpoints exist
4. **Prompt snippets** — ready-to-embed subagent instructions for the ralph-loop prompt
