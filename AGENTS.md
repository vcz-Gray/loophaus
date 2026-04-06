# AGENTS.md

Instructions for AI agents working on the loophaus codebase.

## Project Structure
- `core/` — Pure TypeScript modules (engine, scoring, cleanup, etc.)
- `store/` — State persistence (atomic JSON writes)
- `lib/` — Shared utilities (paths, stop-hook-core)
- `bin/` — CLI entry point (loophaus.ts)
- `platforms/` — Platform adapters (Claude Code, Codex CLI, Kiro CLI)
- `commands/` — Slash command definitions (.md)
- `skills/` — Platform-specific skill definitions
- `hooks/` — Stop hook (stays as .mjs, not TypeScript)
- `tests/` — Vitest test files (.test.mjs)

## Conventions
- All source is TypeScript strict mode
- Imports use .js extension (NodeNext module resolution)
- Tests use .mjs extension (vitest runs them directly)
- No external runtime dependencies (zero-dep)
- hooks/ and platforms/ stay as .mjs (copied to user dirs, must run standalone)

## Testing
- `npm test` — run all tests
- `npm run typecheck` — TypeScript strict check
- `npm run build` — compile to dist/
- `npm run test:coverage` — coverage report

## Adding a new core module
1. Create `core/your-module.ts`
2. Add types to `core/types.ts` if shared
3. Create `tests/your-module.test.mjs`
4. Update `bin/loophaus.ts` if CLI-facing

## Adding a new platform
1. Create `platforms/your-platform/installer.mjs`
2. Add detection in `bin/loophaus.ts` detectHosts()
3. Add install/uninstall handlers
