# ralph-codex

Self-referential iterative development loops for **Codex CLI** and **Claude Code** — with multi-agent orchestration, interactive command generation, and cross-platform stop hooks.

## What is Ralph Loop?

An AI agent works on a task in a continuous loop, seeing its own previous work each iteration, until a completion condition is met. ralph-codex adds smart orchestration on top: automatic phase splitting, parallel subagent spawning, and an interview-driven command generator.

## Requirements

- **Node.js** 18+
- **Codex CLI** v0.114+ or **Claude Code** (any version with plugin support)

## Installation

### npx (recommended)

```bash
npx @graypark/ralph-codex --global
```

### Git clone

```bash
git clone https://github.com/vcz-Gray/ralph-codex.git
cd ralph-codex
node bin/install.mjs --global
```

### Options

| Flag        | Description                                      |
| ----------- | ------------------------------------------------ |
| `--global`  | Install to `~/.codex/` or `~/.claude/` (default) |
| `--local`   | Install to `.codex/` in current project          |
| `--dry-run` | Preview changes without modifying anything       |
| `--force`   | Overwrite existing installation                  |

### What Gets Installed

```
~/.codex/ (or ~/.claude/)
├── plugins/ralph-codex/          # Core plugin files
├── hooks.json                    # Stop hook (merged with existing)
└── skills/
    ├── ralph-loop/               # /ralph-loop — run loops
    ├── cancel-ralph/             # /cancel-ralph — stop loops
    ├── ralph-interview/          # /ralph-interview — generate commands
    └── ralph-orchestrator/       # /ralph-orchestrator — multi-agent patterns
```

## Commands

### `/ralph-interview` — Smart Command Generator

**The recommended way to start.** Interviews you about your task, evaluates whether subagents would help, then generates an optimized command.

```
/ralph-interview
```

1. Describe your task
2. Answer 3–5 targeted questions (scope, verification, parallelism potential, etc.)
3. Get a ready-to-run command with phases, escape hatches, and orchestration

**Auto-execute:** Add "run immediately" or "바로 실행" to start without confirmation:

```
/ralph-interview Refactor the auth module across 3 services, run immediately
```

**Multi-phase tasks:** The interview generates `.ralph/prd.md` + `.ralph/progress.md` files. The loop reads these each iteration to track phases and items:

```
.ralph/
├── prd.md        # All phases and work items
└── progress.md   # What's done, what's next, what's blocked
```

The loop naturally transitions between phases by reading progress. Stop anytime — restart the same command and it picks up where it left off.

### `/ralph-orchestrator` — Multi-Agent Patterns

Analyzes your task and recommends the best orchestration strategy:

| Pattern                                     | Best For                                          |
| ------------------------------------------- | ------------------------------------------------- |
| **Parallel Explore → Sequential Implement** | Large codebase research + targeted fixes          |
| **Divide by Ownership**                     | Multi-service changes (frontend + backend + auth) |
| **Fan-Out / Fan-In**                        | Comprehensive audits (security + perf + a11y)     |
| **Scout-Then-Execute**                      | Unfamiliar codebases                              |
| **Pipeline with Checkpoints**               | Complex multi-stage transformations               |

**Decision matrix** — the orchestrator scores your task automatically:

```
Files span 3+ directories  → +2
Items are independent       → +2
Multiple services/repos     → +3
10+ similar items           → +1
Need full context           → -2
Order matters               → -2

Score >= 3 → Parallel subagents
Score 0–2  → Sequential + optional scout
Score < 0  → Single loop
```

### `/ralph-loop` — Run a Loop Directly

```
/ralph-loop "Build a REST API" --max-iterations 30 --completion-promise "ALL_TESTS_PASS"
```

| Parameter                   | Default    | Description                    |
| --------------------------- | ---------- | ------------------------------ |
| `PROMPT`                    | (required) | Task description               |
| `--max-iterations N`        | 20         | Max iterations (0 = unlimited) |
| `--completion-promise TEXT` | "TADA"     | Phrase that signals completion |

### `/cancel-ralph` — Stop the Loop

```
/cancel-ralph
```

## How the Loop Works

```
┌─────────────────────────────────────────────┐
│  /ralph-loop "Build feature X"              │
│                                             │
│  ┌──────────┐    ┌──────────┐              │
│  │  Agent   │───▶│  Works   │              │
│  │  starts  │    │  on task │              │
│  └──────────┘    └────┬─────┘              │
│                       │                     │
│                       ▼                     │
│              ┌──────────────┐              │
│              │ Tries to exit │              │
│              └───────┬──────┘              │
│                      │                      │
│                      ▼                      │
│            ┌───────────────────┐            │
│            │    Stop Hook      │            │
│            │ ┌───────────────┐ │            │
│            │ │ Max reached?  │─┼──Yes──▶ EXIT
│            │ │ Promise found?│─┼──Yes──▶ EXIT
│            │ └───────┬───────┘ │            │
│            │         No        │            │
│            │    Block exit +   │            │
│            │  re-inject prompt │            │
│            └─────────┬─────────┘            │
│                      │                      │
│              ┌──────────────┐              │
│              │ Sees previous │──── loop ────┘
│              │ work in files │
│              └──────────────┘
```

## Multi-Agent Orchestration Example

For a task like "audit and fix auth across frontend, backend, and auth-service":

```
Phase 1 — Parallel Exploration (3 subagents):
├── Agent "fe-scan": Search frontend for auth issues → report
├── Agent "be-scan": Search backend for auth issues → report
└── Agent "auth-scan": Search auth-service for issues → report

Phase 2 — Merge & Plan:
└── Ralph Loop: Read all reports → create prioritized fix plan

Phase 3 — Parallel Implementation:
├── Agent "fe-dev" (worktree): Fix frontend items
├── Agent "be-dev" (worktree): Fix backend items
└── Agent "auth-dev" (worktree): Fix auth-service items

Phase 4 — Integration:
└── Ralph Loop: Merge branches → run full test suite → fix conflicts
```

The `/ralph-interview` skill generates this automatically when it detects multi-service scope.

## Updating

To update to the latest version:

```bash
npx @graypark/ralph-codex --global --force
```

Or if installed via git:

```bash
cd ralph-codex
git pull
node bin/install.mjs --global --force
```

## Windows Support

Works natively on Windows without WSL or Git Bash:

- All paths use `path.join()` (no hardcoded slashes)
- Installer copies files instead of symlinks on Windows
- State files use JSON (no Unix-specific formats)
- Hooks use `node` as the interpreter (cross-platform)

## Uninstall

```bash
npx @graypark/ralph-codex uninstall
```

## Claude Code Plugin

This package includes a `.claude-plugin/plugin.json` manifest for Claude Code marketplace compatibility. To use as a Claude Code plugin:

1. Clone the repo to your machine
2. In Claude Code, reference the plugin directory
3. Skills (`ralph-interview`, `ralph-orchestrator`, etc.) will be auto-discovered

## Architecture

```
ralph-codex/
├── .claude-plugin/
│   └── plugin.json              # Claude Code marketplace manifest
├── bin/
│   ├── install.mjs              # Cross-platform installer
│   └── uninstall.mjs            # Clean uninstaller
├── hooks/
│   ├── hooks.json               # Hook registration (reference)
│   └── stop-hook.mjs            # Stop hook — core loop engine
├── commands/
│   ├── ralph-loop.md            # /ralph-loop command
│   └── cancel-ralph.md          # /cancel-ralph command
├── skills/
│   ├── ralph-interview/
│   │   └── SKILL.md             # Interactive command generator
│   └── ralph-orchestrator/
│       └── SKILL.md             # Multi-agent orchestration patterns
├── lib/
│   ├── paths.mjs                # Cross-platform path utilities
│   ├── state.mjs                # Loop state management
│   └── stop-hook-core.mjs       # Testable stop hook logic
├── tests/                       # 32 test cases (vitest)
└── package.json
```

## Comparison

| Feature                | Claude Code (official) | Codex CLI (builtin) | ralph-codex (this)       |
| ---------------------- | ---------------------- | ------------------- | ------------------------ |
| Runtime                | Bash (sh/perl)         | Rust                | Node.js (cross-platform) |
| Windows                | WSL required           | Experimental        | Native                   |
| Hook protocol          | JSON                   | JSON                | Same                     |
| Command generator      | None                   | None                | `/ralph-interview`       |
| Multi-agent            | Manual                 | Experimental        | `/ralph-orchestrator`    |
| Orchestration patterns | None                   | None                | 5 built-in patterns      |
| Plugin format          | `.claude-plugin`       | `.codex/skills`     | Both                     |

## Development

```bash
npm install
npm test          # 32 test cases
npx vitest        # watch mode
```

## License

MIT
