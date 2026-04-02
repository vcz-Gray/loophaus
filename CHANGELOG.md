# Changelog

All notable changes to loophaus are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/).

## [3.7.0] - 2026-04-02 — Adoption & Auto-Update

### Added
- **Auto-update system** — `loophaus update-check` and `loophaus upgrade` with gstack-style UX
  - npm registry check with 60min/720min cache TTL
  - Snooze escalation: 24h → 48h → 7d (new version resets snooze)
  - 4-option prompt: upgrade now / always / not now / never ask
  - Pre-flight check injected into `/loop-plan` and `/loop` commands
- **Config CLI** — `loophaus config [list|get|set]` for persistent settings
  - Known keys: cleanup.onNewPlan, updateCheck, autoUpgrade
  - Dot-notation access for nested values
- **CLAUDE.md skill routing** — one-time suggestion to add routing section
  - Maps natural language → loophaus commands (feature → /loop-plan, bug → /loop, etc.)
- **Setup polish** — welcome banner on first install, What's New on upgrade
  - Reads latest CHANGELOG.md entry for upgrade notices
  - `--quiet` flag to suppress extra output
- **ETHOS.md** — core philosophy codified (Fresh Context, Git Safety, Quality Loop, User Sovereignty)
- **CHANGELOG.md** — full version history from v2.0.0

## [3.6.0] - 2026-04-02 — Benchmark & Cleanup

### Added
- **`loophaus benchmark`** — project-level quality scoring (0-100)
  - 6 metrics: tests, typecheck, build, test time, coverage, pkg size
  - Records to `.loophaus/benchmark.tsv` with git commit hash
  - Trend comparison against previous runs
- **`loophaus clean`** — data lifecycle management
  - `--all`, `--traces`, `--sessions`, `--results`, `--before DATE`
  - `benchmark.tsv` is always protected (never deleted)
- **Cleanup policy** in `.loophaus/config.json`
  - `onNewPlan: "archive" | "delete" | "keep"` (default: keep)
  - Archive moves old data to `.loophaus/archive/{date}/`
- **@vitest/coverage-v8** — line coverage reporting

### Changed
- Benchmark score: 83/100 → 91/100 (A+)
  - Coverage exclude: types.ts + bin/ (38% → 70%)
  - Pkg size: 708KB → 456KB (removed sourcemaps)

## [3.5.0] - 2026-04-01 — Quality Hardening (TypeScript)

### Added
- **TypeScript strict mode** — all 21 source modules converted from .mjs to .ts
  - `core/types.ts` with shared interfaces (LoopState, StopHookInput, etc.)
  - `tsconfig.json` with strict: true, module: NodeNext
  - `npm run build` produces dist/ via tsc
  - `npm run typecheck` for standalone type checking
- **47 new tests** covering previously untested modules
  - engine.ts, merge-strategy.ts, parallel-runner.ts, io-helpers.ts, event-logger.ts
  - Error simulation: fs failures, git command failures, corrupted state
  - Input validation: path traversal, injection attacks
- **CLI improvements**
  - Unknown flag validation with helpful error messages
  - "Did you mean?" suggestions (Levenshtein distance)
  - `--verbose` flag for full stack traces on error
  - Spinner progress for long-running operations
  - Contextual error hints (git repo, permissions, missing files)
- **Input validation** for worktree.ts and merge-strategy.ts

### Changed
- Tests: 90 → 296 (3.3x increase)
- Error handling: silent catch → typed errors with LOOPHAUS_DEBUG support

## [3.4.0] - 2026-04-01 — Quality Loop (Autoresearch)

### Added
- **Quality Loop** — inspired by karpathy/autoresearch
  - `core/quality-scorer.ts`: weighted scoring across 6 criteria (tests, typecheck, lint, verify, diff, custom)
  - `core/refine-loop.ts`: keep/discard refinement logic
  - `.loophaus/results.tsv`: all quality attempts logged
- **Phase 5 (Evaluate)** and **Phase 6 (Refine Loop)** in /loop-plan
- **`loophaus quality`** CLI command
- Events: QUALITY_SCORE, REFINE_ATTEMPT, REFINE_KEEP, REFINE_DISCARD
- State: qualityThreshold (default 80), maxRefineAttempts (default 3)

## [3.3.0] - 2026-03-31 — CI/CD, Policy, Sessions

### Added
- Policy engine with conditions: max_iterations, max_cost, max_time_minutes, max_errors
- Session checkpoint/resume system
- Loop registry for multi-loop support
- Cost tracker with per-model pricing
- Trace analyzer with replay and comparison

## [3.2.0] - 2026-03-31 — Worktree & Auto-Parallelization

### Added
- Git worktree lifecycle management (create/remove/list)
- Parallel runner: distribute stories across worktrees
- Merge strategies: sequential, squash, cherry-pick
- Parallelism scoring in /loop-plan (auto-detect parallel vs sequential)

## [3.1.0] - 2026-03-31 — Observability

### Added
- `loophaus watch` — live trace tailing with colors
- `loophaus replay` — trace playback with speed control
- `loophaus compare` — side-by-side trace comparison
- Event logger with JSONL trace format

## [3.0.0] - 2026-03-31 — Core Hardening

### Added
- Schema validation for PRD and state files
- Verify script support (.loophaus/verify.sh)
- Multi-loop support with named loops
- Cost estimation and tracking

### Changed
- State store: atomic writes (tmp + rename)
- Engine: pure function architecture (no I/O, no side effects)

## [2.0.0] - 2026-03-30 — Rebrand to loophaus

### Changed
- Renamed from `@graypark/ralph-codex` to `@graypark/loophaus`
- Commands: /ralph-interview → /loop-plan, /ralph-loop → /loop, /cancel-ralph → /loop-stop
- Added /loop-pulse (new)
- Three-platform support: Claude Code, Codex CLI, Kiro CLI
- Universal stop hook (Node.js)
