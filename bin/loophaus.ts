#!/usr/bin/env node
// loophaus CLI — install, status, stats, uninstall

import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { access } from "node:fs/promises";
import type { LoopEvent } from "../core/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

const args: string[] = process.argv.slice(2);
const command: string = args[0] || "install";
const dryRun: boolean = args.includes("--dry-run");
const force: boolean = args.includes("--force");
const local: boolean = args.includes("--local");
const showHelp: boolean = args.includes("--help") || args.includes("-h");

function getHost(): string | null {
  if (args.includes("--claude")) return "claude-code";
  if (args.includes("--kiro")) return "kiro-cli";
  const idx = args.indexOf("--host");
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return null;
}

const host = getHost();

function getFlag(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith("-")) return args[idx + 1];
  return undefined;
}

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
  npx @graypark/loophaus sessions
  npx @graypark/loophaus resume <session-id>
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
`);
  process.exit(0);
}

if (args.includes("--version")) {
  const { getPackageVersion } = await import("../lib/paths.js");
  console.log(getPackageVersion());
  process.exit(0);
}

async function detectHosts(): Promise<string[]> {
  const hosts: string[] = [];
  const { detect: detectClaude } = await import("../platforms/claude-code/installer.mjs");
  const { detect: detectCodex } = await import("../platforms/codex-cli/installer.mjs");
  const { detect: detectKiro } = await import("../platforms/kiro-cli/installer.mjs");

  if (await detectClaude()) hosts.push("claude-code");
  if (await detectCodex()) hosts.push("codex-cli");
  if (await detectKiro()) hosts.push("kiro-cli");
  return hosts;
}

async function runInstall(): Promise<void> {
  let targets: string[] = [];

  if (host) {
    targets = [host];
  } else {
    targets = await detectHosts();
    if (targets.length === 0) {
      console.log("No supported hosts detected. Install Claude Code, Codex CLI, or Kiro CLI first.");
      console.log("Or specify a host: npx @graypark/loophaus install --host claude-code");
      process.exit(1);
    }
    console.log(`Detected hosts: ${targets.join(", ")}\n`);
  }

  for (const t of targets) {
    if (t === "claude-code") {
      const { install } = await import("../platforms/claude-code/installer.mjs");
      await install({ dryRun, force });
    } else if (t === "codex-cli") {
      const { install } = await import("../platforms/codex-cli/installer.mjs");
      await install({ dryRun, force, local });
    } else if (t === "kiro-cli") {
      const { install } = await import("../platforms/kiro-cli/installer.mjs");
      await install({ dryRun, force });
    } else {
      console.log(`Unknown host: ${t}`);
    }
  }
}

async function runUninstall(): Promise<void> {
  if (host === "claude-code" || args.includes("--claude")) {
    const { uninstall } = await import("./uninstall.js");
    await uninstall({ dryRun, claude: true });
  } else if (host === "kiro-cli" || args.includes("--kiro")) {
    const { uninstall } = await import("../platforms/kiro-cli/installer.mjs");
    await uninstall({ dryRun });
  } else {
    const { uninstall } = await import("./uninstall.js");
    await uninstall({ dryRun, local });
  }
}

async function runStatus(): Promise<void> {
  const name = getFlag("--name");
  const { read } = await import("../store/state-store.js");
  const state = await read(undefined, name);
  if (!state.active) {
    console.log(name ? `No active loop: ${name}` : "No active loop.");
    return;
  }
  const iterInfo = state.maxIterations > 0
    ? `${state.currentIteration}/${state.maxIterations}`
    : `${state.currentIteration}`;
  console.log(`Loop Status`);
  console.log(`\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`);
  if (name) console.log(`Name:       ${name}`);
  console.log(`Active:     yes`);
  console.log(`Iteration:  ${iterInfo}`);
  console.log(`Promise:    ${state.completionPromise || "(none)"}`);

  try {
    const { readFile } = await import("node:fs/promises");
    const prd = JSON.parse(await readFile("prd.json", "utf-8")) as {
      userStories?: Array<{ id: string; title: string; passes?: boolean }>;
    };
    if (Array.isArray(prd.userStories)) {
      const done = prd.userStories.filter((s) => s.passes === true).length;
      const total = prd.userStories.length;
      console.log("");
      console.log("Stories");
      console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
      for (const s of prd.userStories) {
        const icon = s.passes ? "\u2713" : " ";
        console.log(`  ${icon} ${s.id}  ${s.title}`);
      }
      console.log(`\n  Progress: ${done}/${total} done`);
    }
  } catch { /* no prd.json */ }
}

async function runLoops(): Promise<void> {
  const { listLoops } = await import("../core/loop-registry.js");
  const loops = await listLoops();
  if (loops.length === 0) { console.log("No active loops."); return; }
  console.log("Active Loops");
  console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  for (const l of loops) {
    const status = l.active ? "active" : "done";
    const maxIter = l.maxIterations as number || 0;
    const curIter = l.currentIteration as number || 0;
    const iter = maxIter > 0 ? `${curIter}/${maxIter}` : `${curIter}`;
    console.log(`  ${l.name}  [${status}]  iter ${iter}`);
  }
}

async function runStats(): Promise<void> {
  const { readTrace } = await import("../core/event-logger.js");
  const { formatCost } = await import("../core/cost-tracker.js");
  const events = await readTrace();
  if (events.length === 0) {
    console.log("No trace data found. Run a loop first.");
    return;
  }
  const iterations = events.filter((e) => e.event === "iteration").length;
  const stops = events.filter((e) => e.event === "stop");
  const lastStop = stops[stops.length - 1];
  console.log(`Loop Stats`);
  console.log(`\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`);
  console.log(`Total iterations: ${iterations}`);
  console.log(`Total stops:      ${stops.length}`);
  if (lastStop) {
    console.log(`Last stop reason: ${lastStop.reason || "unknown"}`);
    console.log(`Last stop at:     ${lastStop.ts || "unknown"}`);
  }

  const costEvents = events.filter((e) => e.event === "cost" || e.totalCost);
  if (costEvents.length > 0) {
    const totalCost = costEvents.reduce((s, e) => s + ((e.totalCost as number) || 0), 0);
    console.log(`Estimated cost:   ${formatCost(totalCost)}`);
  }

  console.log(`Trace file:       .loophaus/trace.jsonl (${events.length} events)`);
}

async function runWatch(): Promise<void> {
  const { getTracePath } = await import("../core/event-logger.js");
  const { watch: fsWatch } = await import("node:fs");
  const { readFile, stat } = await import("node:fs/promises");
  const tracePath = getTracePath();

  console.log(`Watching ${tracePath}...`);
  console.log("(Ctrl+C to stop)\n");

  let lastSize = 0;
  try {
    const s = await stat(tracePath);
    lastSize = s.size;
  } catch { /* file doesn't exist yet */ }

  const COLORS: Record<string, string> = {
    iteration: "\x1b[36m",
    stop: "\x1b[31m",
    continue: "\x1b[32m",
    error: "\x1b[31m",
    cost: "\x1b[33m",
    state_change: "\x1b[35m",
    verify_script: "\x1b[32m",
    verify_failed: "\x1b[31m",
    story_complete: "\x1b[32m",
    loop_start: "\x1b[36m",
    loop_end: "\x1b[36m",
  };
  const RESET = "\x1b[0m";

  function printEvent(line: string): void {
    try {
      const e = JSON.parse(line) as Record<string, unknown>;
      const color = COLORS[e.event as string] || "";
      const time = e.ts ? new Date(e.ts as string).toLocaleTimeString() : "";
      const detail = e.iteration ? ` iter=${e.iteration}` : e.reason ? ` reason=${e.reason}` : "";
      console.log(`${color}[${time}] ${e.event}${detail}${RESET}`);
    } catch { /* skip malformed */ }
  }

  try {
    const raw = await readFile(tracePath, "utf-8");
    const lines = raw.trim().split("\n").slice(-20);
    for (const line of lines) printEvent(line);
    if (lines.length > 0) console.log("--- live ---\n");
  } catch { /* no file yet */ }

  const { dirname: pathDirname } = await import("node:path");
  const dir = pathDirname(tracePath);
  try {
    fsWatch(dir, { recursive: false }, async () => {
      try {
        const s = await stat(tracePath);
        if (s.size > lastSize) {
          const raw = await readFile(tracePath, "utf-8");
          const lines = raw.trim().split("\n");
          const newLines: string[] = [];
          let pos = 0;
          for (const line of lines) {
            pos += Buffer.byteLength(line + "\n");
            if (pos > lastSize) newLines.push(line);
          }
          for (const line of newLines) printEvent(line);
          lastSize = s.size;
        }
      } catch { /* read error */ }
    });
  } catch {
    console.log("Cannot watch file. Make sure .loophaus/ directory exists.");
    process.exit(1);
  }

  process.stdin.resume();
}

async function runReplay(): Promise<void> {
  const file = args[1];
  if (!file) {
    console.log("Usage: loophaus replay <trace-file> [--speed 2]");
    process.exit(1);
  }
  const speedRaw = getFlag("--speed") || "1";
  const speed = speedRaw === "instant" ? 999999 : (parseFloat(speedRaw) || 1);
  const speedLabel = speed >= 999999 ? "instant" : `${speed}x`;

  const { readTrace } = await import("../core/event-logger.js");
  const { replayTrace, analyzeTrace } = await import("../core/trace-analyzer.js");

  let events: LoopEvent[];
  if (file === ".loophaus/trace.jsonl" || file === "trace.jsonl") {
    events = await readTrace() as LoopEvent[];
  } else {
    const { readFile } = await import("node:fs/promises");
    const raw = await readFile(file, "utf-8");
    events = raw.trim().split("\n").map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) as LoopEvent[];
  }

  if (events.length === 0) { console.log("No events found."); return; }

  const replayed = replayTrace(events, speed);
  const analysis = analyzeTrace(events);

  console.log(`Replaying ${events.length} events (${speedLabel})\n`);

  const COLORS: Record<string, string> = { iteration: "\x1b[36m", stop: "\x1b[31m", continue: "\x1b[32m", error: "\x1b[31m", cost: "\x1b[33m", state_change: "\x1b[35m", verify_script: "\x1b[32m", verify_failed: "\x1b[31m", story_complete: "\x1b[32m", loop_start: "\x1b[36m", loop_end: "\x1b[36m" };
  const RESET = "\x1b[0m";

  let prevMs = 0;
  for (const e of replayed) {
    const delay = speed >= 999999 ? 0 : e.relativeMs - prevMs;
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    prevMs = e.relativeMs;

    const color = COLORS[e.event as string] || "";
    const time = e.ts ? new Date(e.ts as string).toLocaleTimeString() : "";
    const detail = e.iteration ? ` iter=${e.iteration}` : e.reason ? ` reason=${e.reason}` : "";
    console.log(`${color}[${time}] ${e.event}${detail}${RESET}`);
  }

  console.log(`\n--- Summary ---`);
  console.log(`Iterations: ${analysis.iterations}`);
  console.log(`Duration: ${Math.round(analysis.durationMs / 1000)}s`);
  if (analysis.totalCost > 0) console.log(`Cost: $${analysis.totalCost.toFixed(4)}`);
  if (analysis.lastStopReason) console.log(`Stop reason: ${analysis.lastStopReason}`);
}

async function runCompare(): Promise<void> {
  const file1 = args[1];
  const file2 = args[2];
  if (!file1 || !file2) {
    console.log("Usage: loophaus compare <trace1> <trace2>");
    process.exit(1);
  }

  const { readFile } = await import("node:fs/promises");
  const { compareTraces } = await import("../core/trace-analyzer.js");

  function loadTrace(traceFile: string): Promise<LoopEvent[]> {
    return readFile(traceFile, "utf-8").then((raw) =>
      raw.trim().split("\n").map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) as LoopEvent[]
    );
  }

  const [t1, t2] = await Promise.all([loadTrace(file1), loadTrace(file2)]);
  const result = compareTraces(t1, t2);

  console.log("Loop Comparison");
  console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n");

  const fmt = (label: string, v1: string | number, v2: string | number, diff: string | number, unit = ""): void => {
    const arrow = Number(diff) > 0 ? `+${diff}` : `${diff}`;
    const color = Number(diff) > 0 ? "\x1b[31m" : Number(diff) < 0 ? "\x1b[32m" : "";
    const reset = "\x1b[0m";
    console.log(`  ${label.padEnd(20)} ${String(v1).padStart(8)}${unit}  vs  ${String(v2).padStart(8)}${unit}  ${color}(${arrow}${unit})${reset}`);
  };

  fmt("Iterations", result.trace1.iterations, result.trace2.iterations, result.diff.iterations);
  fmt("Duration", Math.round(result.trace1.durationMs / 1000), Math.round(result.trace2.durationMs / 1000), Math.round(result.diff.durationMs / 1000), "s");
  fmt("Stories done", result.trace1.storiesCompleted, result.trace2.storiesCompleted, result.diff.storiesCompleted);
  if (result.trace1.totalCost || result.trace2.totalCost) {
    fmt("Cost", result.trace1.totalCost.toFixed(4), result.trace2.totalCost.toFixed(4), result.diff.totalCost.toFixed(4), "$");
  }
  fmt("Errors", result.trace1.errors, result.trace2.errors, result.trace2.errors - result.trace1.errors);
  console.log("");
}

async function runWorktree(): Promise<void> {
  const sub = args[1];
  const { createWorktree, removeWorktree, listWorktrees } = await import("../core/worktree.js");

  switch (sub) {
    case "create": {
      const name = args[2];
      const base = args[3] || "HEAD";
      if (!name) { console.log("Usage: loophaus worktree create <name> [base-branch]"); return; }
      const wt = await createWorktree(name, base);
      console.log(`Created worktree: ${wt.name} at ${wt.path} (branch: ${wt.branch})`);
      break;
    }
    case "remove": {
      const name = args[2];
      if (!name) { console.log("Usage: loophaus worktree remove <name>"); return; }
      await removeWorktree(name);
      console.log(`Removed worktree: ${name}`);
      break;
    }
    case "list": {
      const wts = await listWorktrees();
      if (wts.length === 0) { console.log("No loophaus worktrees."); return; }
      console.log("Worktrees");
      console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
      for (const wt of wts) {
        console.log(`  ${wt.name}  ${wt.branch}  ${wt.path}`);
      }
      break;
    }
    default:
      console.log("Usage: loophaus worktree <create|remove|list>");
  }
}

async function runSessions(): Promise<void> {
  const { listSessions } = await import("../core/session.js");
  const sessions = await listSessions();
  if (sessions.length === 0) { console.log("No saved sessions."); return; }
  console.log("Sessions");
  console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  for (const s of sessions) {
    const age = Math.round((Date.now() - new Date(s.savedAt).getTime()) / 60000);
    console.log(`  ${(s as Record<string, unknown>).sessionId}  iter=${(s as Record<string, unknown>).currentIteration || 0}  ${age}m ago`);
  }
}

async function runResume(): Promise<void> {
  const id = args[1];
  if (!id) { console.log("Usage: loophaus resume <session-id>"); return; }
  const { resumeSession } = await import("../core/session.js");
  const state = await resumeSession(id);
  if (!state) { console.log(`Session not found: ${id}`); return; }
  console.log(`Resumed session ${id} at iteration ${state.currentIteration}`);
  console.log(`Loop is now active. The stop hook will continue from here.`);
}

async function runParallelCmd(): Promise<void> {
  const prdPath = args[1] || "prd.json";
  const count = parseInt(getFlag("--count") || "2", 10);
  const base = getFlag("--base") || "HEAD";

  const { runParallel } = await import("../core/parallel-runner.js");
  const result = await runParallel({ prdPath, count, baseBranch: base });
  console.log(result.message);
  if (result.worktrees) {
    console.log("\nWorktrees:");
    for (const wt of result.worktrees) {
      console.log(`  ${wt.name}  branch:${wt.branch}  stories:[${wt.stories.join(",")}]`);
    }
  }
}

async function runQuality(): Promise<void> {
  const storyId = getFlag("--story");
  const cwd = process.cwd();

  if (storyId) {
    const { evaluateStory } = await import("../core/quality-scorer.js");
    const { read } = await import("../store/state-store.js");
    const state = await read(cwd);
    const config: Record<string, unknown> = (state.qualityConfig as Record<string, unknown>) || {};

    if (!config.typecheckCommand) {
      try { await access(join(cwd, "tsconfig.json")); config.typecheckCommand = "npx tsc --noEmit"; } catch { /* no tsconfig */ }
    }

    const result = await evaluateStory(storyId, cwd, config);
    console.log(`Quality: ${storyId}`);
    console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
    console.log(`Score: ${result.score}/100 (${result.grade})`);
    for (const [k, v] of Object.entries(result.breakdown)) {
      const numVal = v as number;
      const bar = "\u2588".repeat(numVal) + "\u2591".repeat(10 - numVal);
      console.log(`  ${k.padEnd(10)} ${bar} ${numVal}/10`);
    }
  } else {
    const { readResults } = await import("../core/quality-scorer.js");
    const results = await readResults(cwd);
    if (results.length === 0) { console.log("No quality results yet. Run /loop-plan first."); return; }

    console.log("Quality Results");
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    const byStory: Record<string, typeof results> = {};
    for (const r of results) {
      if (!byStory[r.storyId]) byStory[r.storyId] = [];
      byStory[r.storyId].push(r);
    }
    for (const [sid, attempts] of Object.entries(byStory)) {
      const best = attempts.reduce((a, b) => (a.score > b.score ? a : b));
      const icon = best.status === "keep" ? "\u2713" : best.status === "discard" ? "\u2717" : "~";
      console.log(`  ${icon} ${sid}  score: ${best.score}  (${attempts.length} attempts)`);
    }
  }
}

try {
  switch (command) {
    case "install": await runInstall(); break;
    case "uninstall": await runUninstall(); break;
    case "status": await runStatus(); break;
    case "stats": await runStats(); break;
    case "loops": await runLoops(); break;
    case "watch": await runWatch(); break;
    case "replay": await runReplay(); break;
    case "compare": await runCompare(); break;
    case "worktree": await runWorktree(); break;
    case "parallel": await runParallelCmd(); break;
    case "quality": await runQuality(); break;
    case "sessions": await runSessions(); break;
    case "resume": await runResume(); break;
    default:
      if (command.startsWith("-")) {
        await runInstall();
      } else {
        console.log(`Unknown command: ${command}`);
        console.log("Run: npx @graypark/loophaus --help");
        process.exit(1);
      }
  }
} catch (err) {
  console.error(`\u2718 ${(err as Error).message}`);
  process.exit(1);
}
