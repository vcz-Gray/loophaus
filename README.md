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
git clone https://github.com/Viewcommz/ralph-codex.git
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

## Usage

### Start a Ralph Loop

In Codex CLI, use the slash command:

```
/ralph-loop "Build a REST API for todos with CRUD, validation, and tests" --max-iterations 30 --completion-promise "ALL_TESTS_PASS"
```

**Parameters:**

| Parameter                   | Default    | Description                             |
| --------------------------- | ---------- | --------------------------------------- |
| `PROMPT`                    | (required) | Task description                        |
| `--max-iterations N`        | 20         | Maximum loop iterations (0 = unlimited) |
| `--completion-promise TEXT` | "TADA"     | Phrase that signals task completion     |

### Cancel a Loop

```
/cancel-ralph
```

### How It Works

1. You invoke `/ralph-loop` with a task prompt
2. Codex works on the task normally
3. When Codex tries to exit, the **Stop hook** intercepts
4. The hook checks: max iterations reached? Completion promise found?
5. If not done, the hook **blocks the exit** and feeds the same prompt back
6. Codex sees its previous work in files and git history
7. Codex continues iterating until completion

### Completion Promise

To signal task completion, Codex must output the promise phrase wrapped in XML tags:

```
<promise>ALL_TESTS_PASS</promise>
```

The promise is only valid when the statement is genuinely true. The loop is designed to prevent false exits.

## Prompt Writing Tips

### 1. Split into Phases

```
/ralph-loop "Phase 1: Set up project scaffold. Phase 2: Implement core logic. Phase 3: Add tests. Output <promise>DONE</promise> when all phases complete." --max-iterations 30
```

### 2. Objective Completion Criteria

```
/ralph-loop "Implement the auth module. Done when: all tests pass, no TypeScript errors, coverage > 80%." --completion-promise "AUTH_COMPLETE" --max-iterations 25
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
- Skill files for `/ralph-loop` and `/cancel-ralph`
- Any active state file

## Architecture

```
ralph-codex/
├── bin/
│   ├── install.mjs      # Cross-platform installer
│   └── uninstall.mjs    # Clean uninstaller
├── hooks/
│   ├── hooks.json        # Hook registration (reference)
│   └── stop-hook.mjs     # Stop hook — the core loop engine
├── commands/
│   ├── ralph-loop.md     # /ralph-loop slash command
│   └── cancel-ralph.md   # /cancel-ralph slash command
├── lib/
│   ├── paths.mjs         # Cross-platform path utilities
│   └── state.mjs         # Loop state management
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

## Development

```bash
# Install dev dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npx vitest
```

## License

MIT
