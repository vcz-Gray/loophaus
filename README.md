<p align="center">
  <img src="https://raw.githubusercontent.com/vcz-Gray/ralph-codex/main/assets/ralph-codex-banner.svg" alt="ralph-codex" width="600" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@graypark/ralph-codex"><img src="https://img.shields.io/npm/v/@graypark/ralph-codex.svg?style=flat-square&color=blue" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@graypark/ralph-codex"><img src="https://img.shields.io/npm/dm/@graypark/ralph-codex.svg?style=flat-square&color=green" alt="npm downloads" /></a>
  <a href="https://github.com/vcz-Gray/ralph-codex/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="license" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg?style=flat-square" alt="node version" />
  <img src="https://img.shields.io/badge/platform-Codex%20CLI%20%7C%20Claude%20Code-purple.svg?style=flat-square" alt="platform" />
</p>

<p align="center">
  <b>Iterative AI development loops with PRD-driven task tracking, multi-agent orchestration, and interactive command generation.</b>
</p>

---

## What is Ralph Loop?

An AI agent works on a task in a continuous loop. Each iteration starts with **fresh context** — reading the PRD and progress files to decide what to do next. The agent implements one story, commits, updates progress, and exits. The stop hook intercepts the exit and re-injects the prompt. Repeat until all stories pass.

```
                    ┌──────────────────────┐
                    │   /ralph-interview   │
                    │   Describe your task  │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  Generate prd.json   │
                    │  + progress.txt      │
                    └──────────┬───────────┘
                               │
              ┌────────────────▼────────────────┐
              │         Ralph Loop              │
              │                                 │
              │  1. Read prd.json + progress    │
              │  2. Pick next story (passes=false)│
              │  3. Implement + verify          │
              │  4. Commit + update progress    │
              │  5. Exit attempt                │
              │         │                       │
              │    Stop Hook intercepts         │
              │    Re-injects prompt             │
              │         │                       │
              │    Back to step 1 ──────────────┘
              │                                 │
              │  All stories pass?              │
              │  → <promise>COMPLETE</promise>  │
              └─────────────────────────────────┘
```

## Quick Start

```bash
npx @graypark/ralph-codex --global
```

Then in your AI coding session:

```
/ralph-interview Add user authentication with JWT, bcrypt, and login UI
```

That's it. The interview generates a PRD, activates the loop, and starts implementing story by story.

## Features

| Feature                       | Description                                                                |
| ----------------------------- | -------------------------------------------------------------------------- |
| **PRD-driven loops**          | `prd.json` + `progress.txt` — resumable, inspectable, git-friendly         |
| **Interactive interview**     | `/ralph-interview` asks targeted questions, generates optimized commands   |
| **Multi-agent orchestration** | `/ralph-orchestrator` — 5 patterns for parallel work streams               |
| **One story per iteration**   | Focused context, clean commits, no context rot                             |
| **Cross-platform**            | Node.js stop hook — Windows, macOS, Linux without WSL                      |
| **Ecosystem compatible**      | Works with `ralph-skills:prd`, `ralph-skills:ralph`, official `ralph-loop` |
| **Stop & resume**             | Stop anytime. Restart the same command — picks up where it left off        |

## Installation

### npx (recommended)

```bash
npx @graypark/ralph-codex --global
```

### Clone & install

```bash
git clone https://github.com/vcz-Gray/ralph-codex.git
cd ralph-codex
node bin/install.mjs --global
```

| Flag        | Description                             |
| ----------- | --------------------------------------- |
| `--global`  | Install to `~/.codex/` (default)        |
| `--local`   | Install to `.codex/` in current project |
| `--dry-run` | Preview without changes                 |
| `--force`   | Overwrite existing                      |

<details>
<summary>What gets installed</summary>

```
~/.codex/
├── plugins/ralph-codex/          # Core plugin files
├── hooks.json                    # Stop hook (merged with existing)
└── skills/
    ├── ralph-loop/               # /ralph-loop — run loops
    ├── cancel-ralph/             # /cancel-ralph — stop loops
    ├── ralph-interview/          # /ralph-interview — generate commands
    └── ralph-orchestrator/       # /ralph-orchestrator — multi-agent patterns
```

</details>

## Commands

### `/ralph-interview` — The Main Entry Point

Interviews you about your task, generates a PRD with right-sized stories, activates the loop, and starts working immediately.

```
/ralph-interview Refactor auth module across frontend and backend
```

**What happens:**

1. 3-5 targeted questions (scope, verification, parallelism, etc.)
2. Generates `prd.json` with properly sized and ordered stories
3. Writes `progress.txt` for iteration tracking
4. Activates stop hook and starts implementing US-001

**Quick-run** — skip the "Ready?" prompt:

```
/ralph-interview Add pagination to users API, run immediately
```

### `/ralph-orchestrator` — Multi-Agent Patterns

Recommends the best execution strategy based on your task structure:

| Pattern                                 | When to use                              |
| --------------------------------------- | ---------------------------------------- |
| Parallel Explore → Sequential Implement | Research across large codebase, then fix |
| Divide by Ownership                     | Multi-service changes (fe + be + auth)   |
| Fan-Out / Fan-In                        | Parallel audits (security + perf + a11y) |
| Scout-Then-Execute                      | Unfamiliar codebase                      |
| Pipeline with Checkpoints               | Multi-stage transformations              |

### `/ralph-loop` — Direct Loop

If you already have a PRD or want to write your own prompt:

```
/ralph-loop "Read prd.json, pick next story, implement, verify, commit" --max-iterations 20 --completion-promise "COMPLETE"
```

### `/cancel-ralph` — Stop

```
/cancel-ralph
```

## PRD Format

ralph-codex uses the **ralph-skills compatible** `prd.json` format:

```json
{
  "project": "MyApp",
  "branchName": "ralph/auth-system",
  "description": "JWT authentication with login UI",
  "userStories": [
    {
      "id": "US-001",
      "title": "Add users table with password hash",
      "description": "As a developer, I need user storage for auth",
      "acceptanceCriteria": [
        "Users table with email, password_hash columns",
        "Migration runs successfully",
        "Typecheck passes"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

Each story is sized to complete in **one iteration** (one context window). Dependencies are ordered by priority.

## Ecosystem Compatibility

ralph-codex works seamlessly with existing Ralph tools:

| Tool                         | Compatibility                                                        |
| ---------------------------- | -------------------------------------------------------------------- |
| `ralph-skills:prd`           | Same `prd.json` format — generate PRD there, loop here               |
| `ralph-skills:ralph`         | Same `progress.txt`, same `passes` tracking, same `COMPLETE` promise |
| Official `ralph-loop` plugin | PRD files work with either stop hook                                 |
| `snarktank/ralph`            | Compatible PRD structure and iteration pattern                       |

## Multi-Agent Orchestration

For tasks spanning multiple services or requiring broad exploration:

```
Phase 1 — Parallel Scan (3 agents):
├── Agent "fe-scan": Search frontend/** for auth gaps
├── Agent "be-scan": Search backend/** for auth gaps
└── Agent "db-scan": Review schema for missing constraints

Phase 2 — Sequential Fix (ralph-loop):
└── Read merged findings → implement fixes story by story
```

The interview automatically evaluates parallelism potential using a scoring matrix.

## Updating

```bash
npx @graypark/ralph-codex --global --force
```

## Uninstalling

```bash
npx @graypark/ralph-codex uninstall
```

## Architecture

```
ralph-codex/
├── .claude-plugin/plugin.json        # Claude Code marketplace manifest
├── bin/
│   ├── install.mjs                   # Cross-platform installer
│   └── uninstall.mjs                 # Clean uninstaller
├── hooks/
│   └── stop-hook.mjs                 # Core loop engine (Node.js)
├── commands/
│   ├── ralph-loop.md                 # /ralph-loop command
│   └── cancel-ralph.md              # /cancel-ralph command
├── skills/
│   ├── ralph-interview/SKILL.md     # Interactive command generator
│   └── ralph-orchestrator/SKILL.md  # Multi-agent patterns
├── lib/
│   ├── paths.mjs                     # Cross-platform paths
│   ├── state.mjs                     # Loop state management
│   └── stop-hook-core.mjs           # Testable hook logic
└── tests/                            # 32 test cases (vitest)
```

## Development

```bash
npm install
npm test          # 32 test cases
npx vitest        # watch mode
```

## License

MIT

---

<p align="center">
  Built for <a href="https://github.com/openai/codex">Codex CLI</a> and <a href="https://docs.anthropic.com/en/docs/claude-code">Claude Code</a>
</p>
