#!/usr/bin/env node
// loophaus CLI — thin dispatcher

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateFlags,
  suggestCommand,
  makeGetFlag,
  makeGetNumericFlag,
} from "./cli-utils.js";
import type { CliContext } from "./cli-utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

const args: string[] = process.argv.slice(2);
const command: string = args[0] || "install";
const dryRun: boolean = args.includes("--dry-run");
const force: boolean = args.includes("--force");
const local: boolean = args.includes("--local");
const verbose: boolean = args.includes("--verbose");
const showHelp: boolean = args.includes("--help") || args.includes("-h");

const KNOWN_FLAGS = new Set([
  "--help", "-h", "--version", "--dry-run", "--force", "--local", "--verbose",
  "--host", "--claude", "--kiro", "--name", "--speed", "--count", "--base", "--story",
  "--all", "--traces", "--sessions", "--results", "--before", "--config", "--quiet",
]);

const VALID_COMMANDS = [
  "install", "uninstall", "status", "stats", "loops", "watch",
  "replay", "compare", "worktree", "parallel", "quality",
  "sessions", "resume", "benchmark", "clean", "config",
  "update-check", "upgrade", "demo", "help",
];

validateFlags(args, KNOWN_FLAGS);

if (showHelp || command === "help") {
  console.log(`loophaus — Control plane for coding agents

Usage:
  npx @graypark/loophaus install [--host <name>] [--force] [--dry-run]
  npx @graypark/loophaus uninstall [--host <name>]
  npx @graypark/loophaus status [--name <loop>]
  npx @graypark/loophaus stats [--name <loop>]
  npx @graypark/loophaus watch
  npx @graypark/loophaus replay <trace-file> [--speed 2]
  npx @graypark/loophaus compare <trace1> <trace2>
  npx @graypark/loophaus loops
  npx @graypark/loophaus worktree <create|remove|list>
  npx @graypark/loophaus parallel <prd.json> [--count N] [--base branch]
  npx @graypark/loophaus quality [--story US-001]
  npx @graypark/loophaus benchmark
  npx @graypark/loophaus clean [--all|--traces|--sessions|--results] [--before DATE]
  npx @graypark/loophaus config [list|get|set] [key] [value]
  npx @graypark/loophaus update-check
  npx @graypark/loophaus upgrade
  npx @graypark/loophaus sessions
  npx @graypark/loophaus resume <session-id>
  npx @graypark/loophaus demo
  npx @graypark/loophaus --version

Hosts:
  claude-code    Claude Code (auto-detected via ~/.claude/)
  codex-cli      Codex CLI (auto-detected via ~/.codex/)
  kiro-cli       Kiro CLI (auto-detected via ~/.kiro/)

Install auto-detects available hosts if --host is not specified.

Options:
  --host <name>  Target a specific host
  --claude       Shorthand for --host claude-code
  --kiro         Shorthand for --host kiro-cli
  --name <loop>  Target a named loop (multi-loop)
  --local        Install to project-local .codex/ (Codex only)
  --force        Overwrite existing installation
  --dry-run      Preview changes without modifying files
  --verbose      Show full stack trace on error
`);
  process.exit(0);
}

if (args.includes("--version")) {
  const { getPackageVersion } = await import("../lib/paths.js");
  console.log(getPackageVersion());
  process.exit(0);
}

const ctx: CliContext = {
  args,
  command,
  dryRun,
  force,
  local,
  verbose,
  getFlag: makeGetFlag(args),
  getNumericFlag: makeGetNumericFlag(args),
  projectRoot: PROJECT_ROOT,
};

try {
  switch (command) {
    case "install": { const m = await import("./commands/install.js"); await m.run(ctx); break; }
    case "uninstall": { const m = await import("./commands/uninstall.js"); await m.run(ctx); break; }
    case "status": { const m = await import("./commands/status.js"); await m.run(ctx); break; }
    case "stats": { const m = await import("./commands/stats.js"); await m.run(ctx); break; }
    case "loops": { const m = await import("./commands/loops.js"); await m.run(ctx); break; }
    case "watch": { const m = await import("./commands/watch.js"); await m.run(ctx); break; }
    case "replay": { const m = await import("./commands/replay.js"); await m.run(ctx); break; }
    case "compare": { const m = await import("./commands/compare.js"); await m.run(ctx); break; }
    case "worktree": { const m = await import("./commands/worktree.js"); await m.run(ctx); break; }
    case "parallel": { const m = await import("./commands/parallel.js"); await m.run(ctx); break; }
    case "quality": { const m = await import("./commands/quality.js"); await m.run(ctx); break; }
    case "benchmark": { const m = await import("./commands/benchmark.js"); await m.run(ctx); break; }
    case "clean": { const m = await import("./commands/clean.js"); await m.run(ctx); break; }
    case "config": { const m = await import("./commands/config.js"); await m.run(ctx); break; }
    case "update-check": { const m = await import("./commands/update.js"); await m.runUpdateCheck(ctx); break; }
    case "upgrade": { const m = await import("./commands/update.js"); await m.runUpgrade(ctx); break; }
    case "sessions": { const m = await import("./commands/sessions.js"); await m.run(ctx); break; }
    case "resume": { const m = await import("./commands/sessions.js"); await m.runResume(ctx); break; }
    case "demo": { const m = await import("./commands/demo.js"); await m.run(ctx); break; }
    default:
      if (command.startsWith("-")) {
        const m = await import("./commands/install.js");
        await m.run(ctx);
      } else {
        const suggestion = suggestCommand(command, VALID_COMMANDS);
        console.log(`Unknown command: ${command}`);
        if (suggestion) console.log(`Did you mean: loophaus ${suggestion}?`);
        console.log("Run: loophaus --help for available commands.");
        process.exit(1);
      }
  }
} catch (err) {
  const error = err as Error;
  console.error(`\u2718 ${error.message}`);
  if (verbose && error.stack) {
    console.error(`\n${error.stack}`);
  }
  if (error.message.includes("Not in a git repository")) {
    console.error("  Hint: Run this command from a git project root.");
  } else if (error.message.includes("EACCES") || error.message.includes("permission")) {
    console.error("  Hint: Check file permissions, or try with appropriate access.");
  } else if (error.message.includes("ENOENT")) {
    console.error("  Hint: A required file was not found. Check your working directory.");
  }
  process.exit(1);
}
