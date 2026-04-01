#!/usr/bin/env node
// loophaus CLI — install, status, stats, uninstall

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { access } from "node:fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

const args = process.argv.slice(2);
const command = args[0] || "install";
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const local = args.includes("--local");
const showHelp = args.includes("--help") || args.includes("-h");

function getHost() {
  if (args.includes("--claude")) return "claude-code";
  if (args.includes("--kiro")) return "kiro-cli";
  const idx = args.indexOf("--host");
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return null;
}

const host = getHost();

function getFlag(flag) {
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
  npx @graypark/loophaus loops
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
  const { getPackageVersion } = await import("../lib/paths.mjs");
  console.log(getPackageVersion());
  process.exit(0);
}

async function detectHosts() {
  const hosts = [];
  const { detect: detectClaude } = await import("../platforms/claude-code/installer.mjs");
  const { detect: detectCodex } = await import("../platforms/codex-cli/installer.mjs");
  const { detect: detectKiro } = await import("../platforms/kiro-cli/installer.mjs");

  if (await detectClaude()) hosts.push("claude-code");
  if (await detectCodex()) hosts.push("codex-cli");
  if (await detectKiro()) hosts.push("kiro-cli");
  return hosts;
}

async function runInstall() {
  let targets = [];

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

async function runUninstall() {
  if (host === "claude-code" || args.includes("--claude")) {
    const { uninstall } = await import("./uninstall.mjs");
    await uninstall({ dryRun, claude: true });
  } else if (host === "kiro-cli" || args.includes("--kiro")) {
    const { uninstall } = await import("../platforms/kiro-cli/installer.mjs");
    await uninstall({ dryRun });
  } else {
    const { uninstall } = await import("./uninstall.mjs");
    await uninstall({ dryRun, local });
  }
}

async function runStatus() {
  const name = getFlag("--name");
  const { read } = await import("../store/state-store.mjs");
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
    const prd = JSON.parse(await readFile("prd.json", "utf-8"));
    if (Array.isArray(prd.userStories)) {
      const done = prd.userStories.filter(s => s.passes === true).length;
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

async function runLoops() {
  const { listLoops } = await import("../core/loop-registry.mjs");
  const loops = await listLoops();
  if (loops.length === 0) { console.log("No active loops."); return; }
  console.log("Active Loops");
  console.log("\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  for (const l of loops) {
    const status = l.active ? "active" : "done";
    const iter = l.maxIterations > 0 ? `${l.currentIteration}/${l.maxIterations}` : `${l.currentIteration}`;
    console.log(`  ${l.name}  [${status}]  iter ${iter}`);
  }
}

async function runStats() {
  const { readTrace } = await import("../core/event-logger.mjs");
  const { formatCost } = await import("../core/cost-tracker.mjs");
  const events = await readTrace();
  if (events.length === 0) {
    console.log("No trace data found. Run a loop first.");
    return;
  }
  const iterations = events.filter(e => e.event === "iteration").length;
  const stops = events.filter(e => e.event === "stop");
  const lastStop = stops[stops.length - 1];
  console.log(`Loop Stats`);
  console.log(`\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`);
  console.log(`Total iterations: ${iterations}`);
  console.log(`Total stops:      ${stops.length}`);
  if (lastStop) {
    console.log(`Last stop reason: ${lastStop.reason || "unknown"}`);
    console.log(`Last stop at:     ${lastStop.ts || "unknown"}`);
  }

  const costEvents = events.filter(e => e.event === "cost" || e.totalCost);
  if (costEvents.length > 0) {
    const totalCost = costEvents.reduce((s, e) => s + (e.totalCost || 0), 0);
    console.log(`Estimated cost:   ${formatCost(totalCost)}`);
  }

  console.log(`Trace file:       .loophaus/trace.jsonl (${events.length} events)`);
}

try {
  switch (command) {
    case "install": await runInstall(); break;
    case "uninstall": await runUninstall(); break;
    case "status": await runStatus(); break;
    case "stats": await runStats(); break;
    case "loops": await runLoops(); break;
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
  console.error(`\u2718 ${err.message}`);
  process.exit(1);
}
