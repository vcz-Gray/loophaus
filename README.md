[English](README.md) | [한국어](README.ko.md)

<p align="center">
  <img src="https://raw.githubusercontent.com/vcz-Gray/loophaus/main/assets/loophaus-banner.svg" alt="loophaus" width="600" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@graypark/loophaus"><img src="https://img.shields.io/npm/v/@graypark/loophaus.svg?style=flat-square&color=blue" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@graypark/loophaus"><img src="https://img.shields.io/npm/dm/@graypark/loophaus.svg?style=flat-square&color=green" alt="npm downloads" /></a>
  <a href="https://github.com/vcz-Gray/loophaus/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="license" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg?style=flat-square" alt="node version" />
  <img src="https://img.shields.io/badge/platform-Claude%20Code%20%7C%20Codex%20CLI%20%7C%20Kiro%20CLI-purple.svg?style=flat-square" alt="platform" />
  <img src="https://img.shields.io/badge/tests-36%20passing-brightgreen.svg?style=flat-square" alt="tests" />
</p>

<h3 align="center">Control plane for coding agents — iterative dev loops across Claude Code, Codex CLI, and Kiro CLI.</h3>

<p align="center">
  <sub>Based on <a href="https://ghuntley.com/ralph/">Geoffrey Huntley's Ralph Wiggum technique</a></sub>
</p>

---

## Why loophaus?

AI coding agents struggle with fundamental problems that get worse over long sessions:

| Problem | What happens |
|---------|-------------|
| **Context rot** | Long conversations accumulate noise, the agent gets confused |
| **No checkpoints** | All-or-nothing execution — can't resume after interruption |
| **Lost learnings** | Previous iterations' insights overwritten by new context |
| **Completion ambiguity** | Agent says "done" but tests still fail |
| **Platform lock-in** | Techniques that work in one agent don't transfer to others |

loophaus solves this:

- **Fresh context per iteration** — Each cycle reads PRD + progress from disk, zero degradation
- **Git-enforced safety** — Atomic commits per story, rollback at any point
- **Append-only learnings** — `progress.txt` accumulates knowledge across iterations
- **Test-verified completion** — Agent can only exit when `<promise>COMPLETE</promise>` is genuinely true
- **Universal stop hook** — One Node.js hook works across Claude Code, Codex CLI, and Kiro CLI

## How it works

An AI agent works on a task in a continuous loop. Each iteration starts with fresh context — reading the PRD and progress files to decide what to do next. The agent implements one story, commits, updates progress, and exits. The stop hook intercepts the exit and re-injects the prompt. Repeat until all stories pass.

```
                    ┌──────────────────────┐
                    │      /loop-plan      │
                    │   Describe your task  │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  Generate prd.json   │
                    │  + progress.txt      │
                    └──────────┬───────────┘
                               │
              ┌────────────────▼────────────────┐
              │           /loop                 │
              │                                 │
              │  1. Read prd.json + progress    │
              │  2. Pick next story (passes=false)│
              │  3. Implement + verify          │
              │  4. Commit + update progress    │
              │  5. Exit attempt                │
              │         │                       │
              │    Stop Hook intercepts         │
              │    Re-injects prompt            │
              │         │                       │
              │    Back to step 1 ──────────────┘
              │                                 │
              │  All stories pass?              │
              │  → <promise>COMPLETE</promise>  │
              │                                 │
              │  /loop-pulse → check status     │
              │  /loop-stop  → cancel anytime   │
              └─────────────────────────────────┘
```

## Quick Start

```bash
npx @graypark/loophaus install
```

The installer auto-detects your host (Claude Code, Codex CLI, or Kiro CLI) and sets up everything — stop hook, commands, and skills.

Then in your AI coding session:

```
/loop-plan Add user authentication with JWT, bcrypt, and login UI
```

That's it. The interview generates a PRD, activates the loop, and starts implementing story by story.

## Commands

| Command | Description |
|---------|-------------|
| `/loop-plan` | Interactive interview — asks targeted questions, generates PRD, activates loop |
| `/loop` | Start iterative dev loop directly (when you already have a PRD or custom prompt) |
| `/loop-stop` | Stop the active loop immediately |
| `/loop-pulse` | Check current loop status, iteration count, and progress |

## Platform Support

| | Claude Code | Codex CLI | Kiro CLI |
|---|---|---|---|
| **Stop Hook** | Node.js | Node.js | Node.js |
| **Install target** | Plugin cache | `hooks.json` | `agents/` + `steering/` |
| **Commands** | `/reload-plugins` | native | steering manual mode |
| **Multi-agent** | Agent tool | subprocesses | steering agents |

All three platforms share the same core engine (`core/engine.mjs`) and state store (`store/state-store.mjs`). Platform-specific adapters handle the differences.

## Installation

### Auto-detect (recommended)

```bash
npx @graypark/loophaus install
```

### Specify host

```bash
npx @graypark/loophaus install --host claude-code
npx @graypark/loophaus install --host codex-cli
npx @graypark/loophaus install --host kiro-cli
```

### Flags

| Flag | Description |
|------|-------------|
| `--force` | Overwrite existing installation |
| `--dry-run` | Preview changes without writing files |
| `--local` | Install to project directory instead of global (Codex CLI only) |

## CLI

loophaus ships a standalone CLI for management tasks:

```bash
loophaus install          # Install to detected host
loophaus status           # Show current loop state and active host
loophaus stats            # Iteration history and completion metrics
loophaus uninstall        # Clean removal from all hosts
```

Or via npx:

```bash
npx @graypark/loophaus install
npx @graypark/loophaus status
npx @graypark/loophaus stats
npx @graypark/loophaus uninstall
```

## Architecture

```
loophaus/
├── bin/
│   ├── loophaus.mjs              # CLI entry point
│   ├── install.mjs               # Cross-platform installer
│   └── uninstall.mjs             # Clean uninstaller
├── core/
│   ├── engine.mjs                # Core loop engine (shared)
│   ├── event-logger.mjs          # Iteration event tracking
│   └── loop.schema.json          # PRD validation schema
├── store/
│   └── state-store.mjs           # Loop state persistence
├── platforms/
│   ├── claude-code/
│   │   ├── adapter.mjs           # Claude Code platform adapter
│   │   └── installer.mjs         # Plugin cache installer
│   ├── codex-cli/
│   │   ├── adapter.mjs           # Codex CLI platform adapter
│   │   └── installer.mjs         # hooks.json installer
│   └── kiro-cli/
│       ├── adapter.mjs           # Kiro CLI platform adapter
│       └── installer.mjs         # agents/ + steering/ installer
├── hooks/
│   ├── stop-hook.mjs             # Universal stop hook (Node.js)
│   └── hooks.json                # Hook configuration template
├── commands/
│   ├── loop-plan.md              # /loop-plan command definition
│   ├── loop.md                   # /loop command definition
│   ├── loop-stop.md              # /loop-stop command definition
│   ├── loop-pulse.md             # /loop-pulse command definition
│   └── help.md                   # /help command definition
├── skills/
│   ├── ralph-interview/          # Interactive PRD generator
│   ├── ralph-orchestrator/       # Multi-agent patterns
│   ├── ralph-claude-interview/   # Claude Code interview + Skill tool
│   ├── ralph-claude-loop/        # Claude Code PRD-driven loop
│   ├── ralph-claude-cancel/      # Claude Code cancel
│   └── ralph-claude-orchestrator/# Claude Code Agent tool patterns
├── lib/
│   ├── paths.mjs                 # Cross-platform path resolution
│   ├── state.mjs                 # Legacy state management
│   └── stop-hook-core.mjs        # Testable hook logic
├── .claude-plugin/
│   └── plugin.json               # Claude Code marketplace manifest
└── tests/                        # 36 test cases (vitest)
```

## PRD Format

loophaus uses a `prd.json` format compatible with the ralph-skills ecosystem:

```json
{
  "project": "MyApp",
  "branchName": "loop/auth-system",
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

Each story is sized to complete in one iteration (one context window). Dependencies are ordered by priority. The loop engine picks the next story where `passes` is `false` and works on it until verification succeeds.

## Migrating from ralph-codex

`@graypark/ralph-codex` has been deprecated in favor of `@graypark/loophaus`. The migration is straightforward:

1. **Install loophaus** — it replaces ralph-codex entirely:
   ```bash
   npx @graypark/loophaus install --force
   ```

2. **State files auto-migrate** — Existing `prd.json` and `progress.txt` files are fully compatible. No changes needed.

3. **Command mapping:**

   | ralph-codex | loophaus |
   |-------------|----------|
   | `/ralph-interview` | `/loop-plan` |
   | `/ralph-loop` | `/loop` |
   | `/cancel-ralph` | `/loop-stop` |
   | (none) | `/loop-pulse` |

4. **Uninstall the old package** (optional):
   ```bash
   npx @graypark/ralph-codex uninstall
   ```

## Development

```bash
git clone https://github.com/vcz-Gray/loophaus.git
cd loophaus
npm install
npm test          # 36 test cases
npx vitest        # watch mode
```

## License

MIT

---

<p align="center">
  Built for <a href="https://docs.anthropic.com/en/docs/claude-code">Claude Code</a>, <a href="https://github.com/openai/codex">Codex CLI</a>, and <a href="https://kiro.dev">Kiro CLI</a>
</p>
