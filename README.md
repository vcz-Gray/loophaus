# ralph-codex

Ralph Loop for **OpenAI Codex CLI** — self-referential iterative development loops powered by Stop hooks.

Ralph Loop is a development methodology where an AI agent works on a task in a continuous loop, seeing its own previous work each iteration, until a completion condition is met. This package brings that capability to Codex CLI with full cross-platform support.

## Requirements

- **Node.js** 18+
- **Codex CLI** v0.114+ (experimental hooks engine required)

## Installation

### Option 1: npx (recommended)

```bash
npx @graypark/ralph-codex --global
```

### Option 2: Clone and install

```bash
git clone https://github.com/vcz-Gray/ralph-codex.git
cd ralph-codex
node bin/install.mjs --global
```

### Options

| Flag        | Description                                |
| ----------- | ------------------------------------------ |
| `--global`  | Install to `~/.codex/` (default)           |
| `--local`   | Install to `.codex/` in current project    |
| `--dry-run` | Preview changes without modifying anything |
| `--force`   | Overwrite existing installation            |

### What Gets Installed

```
~/.codex/
├── plugins/ralph-codex/     # Core plugin files
├── hooks.json               # Stop hook registration (merged)
└── skills/
    ├── ralph-loop/          # /ralph-loop command
    ├── cancel-ralph/        # /cancel-ralph command
    └── ralph-interview/     # /ralph-interview command
```

## Commands

### `/ralph-interview` — Generate Optimized Commands

**The easiest way to get started.** This interactive skill interviews you about your task and generates a perfectly structured `/ralph-loop` command.

```
/ralph-interview
```

**How it works:**

1. Describe your task (e.g., "Add auth to our API")
2. The interview asks 3–5 targeted questions (scope, success criteria, verification commands, etc.)
3. It generates a copy-paste-ready `/ralph-loop` command with:
   - Proper phase separation (analysis vs. implementation)
   - Self-correcting work cycles (modify → verify → retry)
   - Escape hatches for when you're stuck
   - Objective completion criteria
   - Atomic git commits per work item

**Auto-execute mode:** Add "run immediately" or "바로 실행" to skip the confirmation step:

```
/ralph-interview Add pagination to the users API, run immediately
```

After generating, it will ask:

```
Ready to run?
- y / yes → Start Phase 1 immediately
- n / no  → Commands are above, copy-paste when ready
- edit    → Tell me what to change
```

### `/ralph-loop` — Run a Loop Directly

If you already know how to write a good prompt:

```
/ralph-loop "Build a REST API for todos with CRUD, validation, and tests" --max-iterations 30 --completion-promise "ALL_TESTS_PASS"
```

**Parameters:**

| Parameter                   | Default    | Description                             |
| --------------------------- | ---------- | --------------------------------------- |
| `PROMPT`                    | (required) | Task description                        |
| `--max-iterations N`        | 20         | Maximum loop iterations (0 = unlimited) |
| `--completion-promise TEXT` | "TADA"     | Phrase that signals task completion     |

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
│  │  Codex   │───▶│  Works   │              │
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
│            │         │         │            │
│            │    Block exit +   │            │
│            │  re-inject prompt │            │
│            └─────────┬─────────┘            │
│                      │                      │
│                      ▼                      │
│              ┌──────────────┐              │
│              │ Codex sees   │              │
│              │ previous work│──── loop ────┘
│              └──────────────┘
```

### Completion Promise

To signal task completion, Codex must output the promise phrase in XML tags:

```
<promise>ALL_TESTS_PASS</promise>
```

The promise is only valid when the statement is genuinely true. The loop prevents false exits.

## Prompt Writing Tips

> **Tip:** Use `/ralph-interview` instead of writing prompts manually. It handles all of these patterns for you.

### 1. Split into Phases

```
/ralph-loop "Phase 1: Set up project scaffold.
Phase 2: Implement core logic.
Phase 3: Add tests.
Output <promise>DONE</promise> when all phases complete." --max-iterations 30
```

### 2. Objective Completion Criteria

```
/ralph-loop "Implement the auth module.
Done when: all tests pass, no TypeScript errors, coverage > 80%." --completion-promise "AUTH_COMPLETE" --max-iterations 25
```

### 3. Always Set an Escape Hatch

Always use `--max-iterations` to prevent infinite loops on impossible tasks.

### 4. Self-Correction Pattern

```
/ralph-loop "Fix the failing CI pipeline. Run tests, read errors, fix code, repeat." --max-iterations 15 --completion-promise "CI_GREEN"
```

## Windows Support

ralph-codex works natively on Windows without WSL or Git Bash:

- All paths use `path.join()` (no hardcoded slashes)
- The installer copies files instead of symlinks on Windows
- State files use JSON (no Unix-specific formats)
- Hooks use `node` as the interpreter (cross-platform)

Tested on: Windows 10/11, macOS, Linux (Ubuntu/Debian).

## Uninstall

```bash
npx @graypark/ralph-codex uninstall
# or
node bin/uninstall.mjs --global
```

This removes:

- Plugin files from `~/.codex/plugins/ralph-codex/`
- Stop hook entry from `~/.codex/hooks.json`
- All skill files (`ralph-loop`, `cancel-ralph`, `ralph-interview`)
- Any active state file

## Architecture

```
ralph-codex/
├── bin/
│   ├── install.mjs          # Cross-platform installer
│   └── uninstall.mjs        # Clean uninstaller
├── hooks/
│   ├── hooks.json            # Hook registration (reference)
│   └── stop-hook.mjs         # Stop hook — the core loop engine
├── commands/
│   ├── ralph-loop.md         # /ralph-loop slash command
│   └── cancel-ralph.md       # /cancel-ralph slash command
├── skills/
│   └── ralph-interview/
│       └── SKILL.md          # /ralph-interview — interactive command generator
├── lib/
│   ├── paths.mjs             # Cross-platform path utilities
│   ├── state.mjs             # Loop state management
│   └── stop-hook-core.mjs    # Testable stop hook logic
├── tests/                    # 32 test cases (vitest)
└── package.json
```

## How It Compares to Claude Code's Ralph Loop

| Feature            | Claude Code (official)                | ralph-codex (this)       |
| ------------------ | ------------------------------------- | ------------------------ |
| Runtime            | Bash (sh/perl)                        | Node.js (cross-platform) |
| State format       | Markdown + YAML frontmatter           | JSON                     |
| Windows support    | WSL required                          | Native                   |
| Hook protocol      | `{"decision":"block","reason":"..."}` | Same                     |
| Transcript parsing | `jq` + `grep`                         | Native Node.js           |
| Installation       | Plugin marketplace                    | `npx` or manual          |
| Command generator  | None                                  | `/ralph-interview`       |

## Development

```bash
# Install dev dependencies
npm install

# Run tests (32 cases)
npm test

# Run tests in watch mode
npx vitest
```

## License

MIT
